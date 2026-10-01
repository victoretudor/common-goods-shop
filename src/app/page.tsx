import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const all = await db.select().from(products).orderBy(asc(products.id));

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-stone-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-300">New season</p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Everyday goods, made to last.
        </h1>
        <p className="mt-3 max-w-lg text-stone-300">
          Small-batch homeware and accessories. Free shipping on orders over $50.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">All products</h2>
        {all.length === 0 ? (
          <p className="text-stone-500">
            No products yet. Run <code className="rounded bg-stone-200 px-1">npm run db:seed</code>{" "}
            to add some.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {all.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
