import { json, withUser } from "@/lib/api";
import { getCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, userId) => json(await getCart(userId)));
