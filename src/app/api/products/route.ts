import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const all = await db.select().from(products).orderBy(asc(products.id));
  return json({ products: all });
}
