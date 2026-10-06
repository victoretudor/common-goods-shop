import { apiError, json, withUser } from "@/lib/api";
import { getOrder } from "@/lib/shop";

export const dynamic = "force-dynamic";

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (_req, userId, { params }) => {
  const { id } = await params;
  const result = await getOrder(userId, Number(id));
  if (!result) return apiError("Order not found", 404);
  return json(result);
});
