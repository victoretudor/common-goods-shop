import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/orders");

  const list = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Your orders</h1>
      {list.length === 0 ? (
        <p className="text-stone-600">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/" className="underline">
            Start shopping
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {list.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-stone-50">
                <div>
                  <p className="font-medium">Order #{o.id}</p>
                  <p className="text-sm text-stone-500">
                    {o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatPrice(o.totalCents)}</p>
                  <p className="text-sm capitalize text-stone-500">{o.status}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
