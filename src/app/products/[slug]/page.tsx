import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addToCart } from "@/app/actions";
import { db } from "@/db";
import { products } from "@/db/schema";
import { SubmitButton } from "@/components/SubmitButton";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getProduct(slug: string) {
  return db.query.products.findFirst({ where: eq(products.slug, slug) });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  return { title: product?.name ?? "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const inStock = product.stock > 0;

  return (
    <div>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-900">
        ← Back to shop
      </Link>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-sm uppercase tracking-wide text-stone-500">{product.category}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-3 text-2xl">{formatPrice(product.priceCents)}</p>
          <p className="mt-6 leading-relaxed text-stone-700">{product.description}</p>

          <p className={`mt-6 text-sm ${inStock ? "text-green-700" : "text-red-700"}`}>
            {inStock
              ? product.stock <= 5
                ? `Only ${product.stock} left`
                : "In stock"
              : "Sold out"}
          </p>

          <form action={addToCart} className="mt-4">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="returnTo" value={`/products/${product.slug}`} />
            <SubmitButton disabled={!inStock} pendingText="Adding…" className="btn-primary w-full sm:w-auto">
              {inStock ? "Add to cart" : "Sold out"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
