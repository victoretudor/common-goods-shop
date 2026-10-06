import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";
import { getCartCount } from "@/lib/cart";
import { CartLiveSync } from "./CartLiveSync";

export async function Header() {
  const session = await auth();
  const cartCount = session?.user?.id ? await getCartCount(session.user.id) : 0;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      {session?.user && <CartLiveSync />}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Common <span className="text-brand">Goods</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-3">
          <Link href="/" className="rounded-md px-2 py-1.5 hover:bg-stone-100">
            Shop
          </Link>
          {session?.user && (
            <Link href="/orders" className="rounded-md px-2 py-1.5 hover:bg-stone-100">
              Orders
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-md px-2 py-1.5 hover:bg-stone-100"
            aria-label={`Cart, ${cartCount} items`}
          >
            Cart
            {cartCount > 0 && (
              <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {session?.user ? (
            <div className="ml-1 flex items-center gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              )}
              <form action={signOutAction}>
                <button className="rounded-md px-2 py-1.5 text-stone-600 hover:bg-stone-100">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/signin" className="ml-1 rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white hover:bg-stone-700">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
