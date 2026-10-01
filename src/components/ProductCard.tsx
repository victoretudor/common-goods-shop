import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/db/schema";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {product.stock === 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">
            Sold out
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-stone-500">{product.category}</p>
        <h3 className="mt-1 font-medium">{product.name}</h3>
        <p className="mt-1 text-sm text-stone-700">{formatPrice(product.priceCents)}</p>
      </div>
    </Link>
  );
}
