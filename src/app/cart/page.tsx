import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { removeFromCart, updateCartQuantity } from "@/app/actions";
import { OrderSummary } from "@/components/OrderSummary";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Cart" };

export default async function CartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/cart");

  const cart = await getCart(session.user.id);

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto mt-12 max-w-md text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-stone-600">Find something you like and add it here.</p>
        <Link href="/" className="btn-primary mt-6">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {cart.items.map(({ id, quantity, product }) => (
            <li key={id} className="flex gap-4 p-4">
              <Link
                href={`/products/${product.slug}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100"
              >
                <Image src={product.imageUrl} alt={product.name} fill sizes="96px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <Link href={`/products/${product.slug}`} className="font-medium hover:underline">
                    {product.name}
                  </Link>
                  <p className="font-medium">{formatPrice(product.priceCents * quantity)}</p>
                </div>
                <p className="text-sm text-stone-500">{formatPrice(product.priceCents)} each</p>

                <div className="mt-auto flex items-center gap-3 pt-3">
                  <div className="flex items-center rounded-lg border border-stone-300">
                    <form action={updateCartQuantity}>
                      <input type="hidden" name="itemId" value={id} />
                      <input type="hidden" name="quantity" value={quantity - 1} />
                      <button className="cursor-pointer px-3 py-1 hover:bg-stone-100" aria-label="Decrease quantity">
                        −
                      </button>
                    </form>
                    <span className="min-w-8 text-center text-sm">{quantity}</span>
                    <form action={updateCartQuantity}>
                      <input type="hidden" name="itemId" value={id} />
                      <input type="hidden" name="quantity" value={quantity + 1} />
                      <button
                        className="cursor-pointer px-3 py-1 hover:bg-stone-100 disabled:opacity-40"
                        disabled={quantity >= product.stock}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </form>
                  </div>
                  <form action={removeFromCart}>
                    <input type="hidden" name="itemId" value={id} />
                    <button className="cursor-pointer text-sm text-stone-500 hover:text-red-700">Remove</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-6">
          <OrderSummary
            subtotalCents={cart.subtotalCents}
            shippingCents={cart.shippingCents}
            totalCents={cart.totalCents}
          />
          <Link href="/checkout" className="btn-primary mt-6 w-full">
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
