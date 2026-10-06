import { json, readJson, withUser } from "@/lib/api";
import { checkoutSchema, listOrders, placeOrder } from "@/lib/shop";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, userId) => json({ orders: await listOrders(userId) }));

/** Checkout. Body: contact + shipping details. Turns the cart into an order. */
export const POST = withUser(async (req, userId) => {
  const details = checkoutSchema.parse(await readJson(req));
  const { orderId, emailSent } = await placeOrder(userId, details);
  return json({ orderId, emailSent }, 201);
});
