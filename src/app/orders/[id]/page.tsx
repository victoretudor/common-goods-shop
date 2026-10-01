import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { OrderSummary } from "@/components/OrderSummary";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Order details" };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/orders/${id}`);

  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, session.user.id)),
  });
  if (!order) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return (
    <div className="mx-auto max-w-2xl">
      {placed && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
          <h1 className="text-lg font-semibold text-green-900">Thank you! Your order is confirmed.</h1>
          <p className="mt-1 text-sm text-green-800">
            {order.confirmationEmailSentAt
              ? `A confirmation email has been sent to ${order.email}.`
              : "We couldn't send the confirmation email right now, but your order has been saved."}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Order #{order.id}</h2>
            <p className="text-sm text-stone-500">
              Placed {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-sm capitalize">{order.status}</span>
        </div>

        <ul className="my-6 divide-y divide-stone-200 border-y border-stone-200">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-3 text-sm">
              <span>
                {i.name} <span className="text-stone-500">× {i.quantity}</span>
              </span>
              <span>{formatPrice(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>

        <OrderSummary
          subtotalCents={order.subtotalCents}
          shippingCents={order.shippingCents}
          totalCents={order.totalCents}
          showFreeShippingHint={false}
        />

        <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <h3 className="mb-1 font-medium">Shipping to</h3>
            <p className="leading-relaxed text-stone-600">
              {order.fullName}
              <br />
              {order.addressLine1}
              {order.addressLine2 && (
                <>
                  <br />
                  {order.addressLine2}
                </>
              )}
              <br />
              {[order.city, order.state, order.postalCode].filter(Boolean).join(", ")}
              <br />
              {order.country}
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-medium">Contact</h3>
            <p className="leading-relaxed text-stone-600">
              {order.email}
              {order.phone && (
                <>
                  <br />
                  {order.phone}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <Link href="/" className="btn-secondary mt-6">
        Continue shopping
      </Link>
    </div>
  );
}
