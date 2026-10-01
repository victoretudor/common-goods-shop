import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CheckoutForm } from "@/components/CheckoutForm";
import { OrderSummary } from "@/components/OrderSummary";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/checkout");

  const cart = await getCart(session.user.id);
  if (cart.items.length === 0) redirect("/cart");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm
          defaultEmail={session.user.email ?? ""}
          defaultName={session.user.name ?? ""}
          totalLabel={formatPrice(cart.totalCents)}
        />

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-semibold">Order summary</h2>
          <ul className="mb-4 space-y-3">
            {cart.items.map(({ id, quantity, product }) => (
              <li key={id} className="flex items-center gap-3 text-sm">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-stone-100">
                  <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                  <span className="absolute -right-1 -top-1 rounded-full bg-stone-700 px-1.5 text-xs text-white">
                    {quantity}
                  </span>
                </div>
                <span className="flex-1">{product.name}</span>
                <span>{formatPrice(product.priceCents * quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-200 pt-4">
            <OrderSummary
              subtotalCents={cart.subtotalCents}
              shippingCents={cart.shippingCents}
              totalCents={cart.totalCents}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
