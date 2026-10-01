"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { db } from "@/db";
import { cartItems, orderItems, orders, products } from "@/db/schema";
import { shippingFor } from "@/lib/format";
import { sendOrderConfirmation } from "@/lib/mailgun";

async function requireUserId(callbackUrl: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user.id;
}

// ---------- Auth ----------

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = String(formData.get("callbackUrl") || "/");
  // Only allow same-site redirects
  await signIn("google", { redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------- Cart ----------

export async function addToCart(formData: FormData) {
  const productId = Number(formData.get("productId"));
  const returnTo = String(formData.get("returnTo") || "/");
  const userId = await requireUserId(returnTo);

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product || product.stock <= 0) return;

  await db
    .insert(cartItems)
    .values({ userId, productId, quantity: 1 })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: sql`least(${cartItems.quantity} + 1, ${product.stock})` },
    });

  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function updateCartQuantity(formData: FormData) {
  const itemId = Number(formData.get("itemId"));
  const quantity = Number(formData.get("quantity"));
  const userId = await requireUserId("/cart");
  const owned = and(eq(cartItems.id, itemId), eq(cartItems.userId, userId));

  if (!Number.isInteger(quantity) || quantity <= 0) {
    await db.delete(cartItems).where(owned);
  } else {
    const row = await db
      .select({ stock: products.stock })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(owned);
    if (row[0]) {
      await db
        .update(cartItems)
        .set({ quantity: Math.min(quantity, row[0].stock) })
        .where(owned);
    }
  }
  revalidatePath("/", "layout");
}

export async function removeFromCart(formData: FormData) {
  const itemId = Number(formData.get("itemId"));
  const userId = await requireUserId("/cart");
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
  revalidatePath("/", "layout");
}

// ---------- Checkout ----------

const checkoutSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  fullName: z.string().trim().min(2, "Enter your full name"),
  addressLine1: z.string().trim().min(3, "Enter your street address"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().min(2, "Enter your postal code"),
  country: z.string().trim().min(2, "Enter your country"),
  phone: z.string().trim().optional(),
});

type CheckoutField = keyof z.infer<typeof checkoutSchema>;

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<CheckoutField, string[]>>;
  values?: Partial<Record<CheckoutField, string>>;
};

class CheckoutError extends Error {}

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const userId = await requireUserId("/checkout");

  const values = Object.fromEntries(
    Object.keys(checkoutSchema.shape).map((k) => [k, String(formData.get(k) ?? "")]),
  ) as Record<CheckoutField, string>;

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }
  const details = parsed.data;

  let orderId: number;
  try {
    orderId = await db.transaction(async (tx) => {
      const cart = await tx
        .select({ quantity: cartItems.quantity, product: products })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.userId, userId));

      if (cart.length === 0) throw new CheckoutError("Your cart is empty.");

      // Reserve stock atomically; fails if someone else bought it first
      for (const { product, quantity } of cart) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${quantity}` })
          .where(and(eq(products.id, product.id), gte(products.stock, quantity)))
          .returning({ id: products.id });
        if (updated.length === 0) {
          throw new CheckoutError(
            `Sorry, "${product.name}" doesn't have enough stock left. Please update your cart.`,
          );
        }
      }

      const subtotalCents = cart.reduce((s, c) => s + c.product.priceCents * c.quantity, 0);
      const shippingCents = shippingFor(subtotalCents);

      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          ...details,
          addressLine2: details.addressLine2 || null,
          state: details.state || null,
          phone: details.phone || null,
          subtotalCents,
          shippingCents,
          totalCents: subtotalCents + shippingCents,
        })
        .returning({ id: orders.id });

      await tx.insert(orderItems).values(
        cart.map(({ product, quantity }) => ({
          orderId: order.id,
          productId: product.id,
          name: product.name,
          unitPriceCents: product.priceCents,
          quantity,
        })),
      );

      await tx.delete(cartItems).where(eq(cartItems.userId, userId));
      return order.id;
    });
  } catch (err) {
    if (err instanceof CheckoutError) return { error: err.message, values };
    console.error("placeOrder failed", err);
    return { error: "Something went wrong placing your order. Please try again.", values };
  }

  // The order is committed; a failed email shouldn't fail the checkout.
  try {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (order) {
      await sendOrderConfirmation(order, items);
      await db
        .update(orders)
        .set({ confirmationEmailSentAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  } catch (err) {
    console.error(`Confirmation email for order ${orderId} failed`, err);
  }

  revalidatePath("/", "layout");
  redirect(`/orders/${orderId}?placed=1`);
}
