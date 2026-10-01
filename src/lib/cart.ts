import { eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products } from "@/db/schema";
import { shippingFor } from "./format";

export async function getCart(userId: string) {
  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      product: products,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId))
    .orderBy(cartItems.createdAt);

  const subtotalCents = items.reduce((s, i) => s + i.product.priceCents * i.quantity, 0);
  const shippingCents = shippingFor(subtotalCents);
  return { items, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}

export async function getCartCount(userId: string) {
  const [row] = await db
    .select({ count: sum(cartItems.quantity) })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  return Number(row?.count ?? 0);
}
