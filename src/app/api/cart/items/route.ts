import { json, readJson, withUser } from "@/lib/api";
import { getCart } from "@/lib/cart";
import { addCartItem } from "@/lib/shop";

export const dynamic = "force-dynamic";

/** Body: { productId: number, quantity?: number }. Returns the updated cart. */
export const POST = withUser(async (req, userId) => {
  const body = await readJson(req);
  await addCartItem(userId, Number(body?.productId), Number(body?.quantity ?? 1));
  return json(await getCart(userId), 201);
});
