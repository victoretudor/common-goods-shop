// Shop logic shared by the website's server actions and the REST API used by the mobile app.

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cartItems, orderItems, orders, products } from "@/db/schema";
import { shippingFor } from "./format";
import { sendOrderConfirmation } from "./mailgun";

/** An error that's safe to show to the user, with the HTTP status the API should return. */
export class ShopError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

// ---------- Cart ----------

export async function addCartItem(userId: string, productId: number, quantity = 1) {
  if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
    throw new ShopError("Invalid product or quantity.");
  }
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!product) throw new ShopError("Product not found.", 404);
  if (product.stock <= 0) throw new ShopError(`"${product.name}" is sold out.`, 409);

  await db
    .insert(cartItems)
    .values({ userId, productId, quantity: Math.min(quantity, product.stock) })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId],
      set: { quantity: sql`least(${cartItems.quantity} + ${quantity}, ${product.stock})` },
    });
}

/** Sets an item's quantity; zero or less removes it. */
export async function setCartItemQuantity(userId: string, itemId: number, quantity: number) {
  const owned = and(eq(cartItems.id, itemId), eq(cartItems.userId, userId));

  if (!Number.isInteger(quantity) || quantity <= 0) {
    await db.delete(cartItems).where(owned);
    return;
  }
  const [row] = await db
    .select({ stock: products.stock })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(owned);
  if (!row) throw new ShopError("Cart item not found.", 404);
  await db
    .update(cartItems)
    .set({ quantity: Math.min(quantity, row.stock) })
    .where(owned);
}

export async function removeCartItem(userId: string, itemId: number) {
  await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, userId)));
}

// ---------- Checkout ----------

export const checkoutSchema = z.object({
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

export type CheckoutDetails = z.infer<typeof checkoutSchema>;
export type CheckoutField = keyof CheckoutDetails;

/**
 * Turns the user's cart into an order: reserves stock, saves the order, empties the cart,
 * then sends the confirmation email. Returns the new order's id and whether the email went out.
 */
export async function placeOrder(userId: string, details: CheckoutDetails) {
  const orderId = await db.transaction(async (tx) => {
    const cart = await tx
      .select({ quantity: cartItems.quantity, product: products })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));

    if (cart.length === 0) throw new ShopError("Your cart is empty.", 409);

    // Reserve stock atomically; fails if someone else bought it first
    for (const { product, quantity } of cart) {
      const updated = await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${quantity}` })
        .where(and(eq(products.id, product.id), gte(products.stock, quantity)))
        .returning({ id: products.id });
      if (updated.length === 0) {
        throw new ShopError(
          `Sorry, "${product.name}" doesn't have enough stock left. Please update your cart.`,
          409,
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

  // The order is committed; a failed email shouldn't fail the checkout.
  let emailSent = false;
  try {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (order) {
      await sendOrderConfirmation(order, items);
      await db
        .update(orders)
        .set({ confirmationEmailSentAt: new Date() })
        .where(eq(orders.id, orderId));
      emailSent = true;
    }
  } catch (err) {
    console.error(`Confirmation email for order ${orderId} failed`, err);
  }

  return { orderId, emailSent };
}

// ---------- Orders ----------

export async function listOrders(userId: string) {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrder(userId: string, orderId: number) {
  if (!Number.isInteger(orderId)) return null;
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
  });
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}
