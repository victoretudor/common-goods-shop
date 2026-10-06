import { json, readJson, withUser } from "@/lib/api";
import { getCart } from "@/lib/cart";
import { removeCartItem, setCartItemQuantity } from "@/lib/shop";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Body: { quantity: number } (0 removes the item). Returns the updated cart. */
export const PATCH = withUser<Ctx>(async (req, userId, { params }) => {
  const { id } = await params;
  const body = await readJson(req);
  await setCartItemQuantity(userId, Number(id), Number(body?.quantity));
  return json(await getCart(userId));
});

export const DELETE = withUser<Ctx>(async (_req, userId, { params }) => {
  const { id } = await params;
  await removeCartItem(userId, Number(id));
  return json(await getCart(userId));
});
