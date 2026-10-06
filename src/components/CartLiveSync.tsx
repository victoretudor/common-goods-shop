"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type StreamCart = { items: { id: number; quantity: number }[] };

const cartKey = (cart: StreamCart) => cart.items.map((i) => `${i.id}:${i.quantity}`).join(",");

/**
 * Keeps the page in sync with cart changes made elsewhere (the mobile app, another tab)
 * by listening to /api/cart/stream and refreshing server data when the cart changes.
 * The stream is only open while the tab is visible.
 */
export function CartLiveSync() {
  const router = useRouter();

  useEffect(() => {
    let source: EventSource | null = null;
    let lastKey: string | null = null;

    const open = () => {
      if (source) return;
      source = new EventSource("/api/cart/stream");
      source.addEventListener("cart", (e) => {
        const key = cartKey(JSON.parse((e as MessageEvent).data));
        // The first event after (re)connecting is the current cart; refresh only on a real change.
        if (lastKey !== null && key !== lastKey) router.refresh();
        lastKey = key;
      });
    };
    const close = () => {
      source?.close();
      source = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? open() : close());

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    };
  }, [router]);

  return null;
}
