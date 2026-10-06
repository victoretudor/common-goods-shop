import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { apiError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (!product) return apiError("Product not found", 404);
  return json({ product });
}
