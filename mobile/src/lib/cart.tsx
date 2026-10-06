import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import EventSource from "react-native-sse";

import { api } from "./api";
import { useAuth } from "./auth";
import { API_URL } from "./config";
import type { Cart } from "./types";

// The cart lives on the server, shared with the website. We keep a live connection to
// /api/cart/stream, which pushes the whole cart whenever it changes on ANY device — so an
// item added on the website shows up here within about a second, without refreshing.

type CartContextValue = {
  cart: Cart | null;
  /** True while the live connection to the server is open. */
  live: boolean;
  add: (productId: number, quantity?: number) => Promise<void>;
  setQuantity: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token, signOut } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!token) {
      setCart(null);
      setLive(false);
      return;
    }

    let source: EventSource<"cart"> | null = null;

    const connect = () => {
      if (source) return;
      const es = new EventSource<"cart">(`${API_URL}/api/cart/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        // The server ends each stream after a few minutes; reconnect after 1s.
        pollingInterval: 1000,
      });
      es.addEventListener("open", () => setLive(true));
      es.addEventListener("cart", (event) => {
        if (event.data) setCart(JSON.parse(event.data));
      });
      es.addEventListener("error", (event) => {
        setLive(false);
        if (event.type === "error" && event.xhrStatus === 401) {
          disconnect();
          void signOut();
        }
      });
      es.addEventListener("close", () => setLive(false));
      source = es;
    };

    const disconnect = () => {
      source?.removeAllEventListeners();
      source?.close();
      source = null;
      setLive(false);
    };

    // Only hold the connection while the app is on screen.
    if (AppState.currentState === "active") connect();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") connect();
      else disconnect();
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, [token, signOut]);

  const refresh = useCallback(async () => {
    if (token) setCart(await api<Cart>("/api/cart"));
  }, [token]);

  const add = useCallback(async (productId: number, quantity = 1) => {
    setCart(await api<Cart>("/api/cart/items", "POST", { productId, quantity }));
  }, []);

  const setQuantity = useCallback(async (itemId: number, quantity: number) => {
    setCart(await api<Cart>(`/api/cart/items/${itemId}`, "PATCH", { quantity }));
  }, []);

  const remove = useCallback(async (itemId: number) => {
    setCart(await api<Cart>(`/api/cart/items/${itemId}`, "DELETE"));
  }, []);

  const value = useMemo(
    () => ({ cart, live, add, setQuantity, remove, refresh }),
    [cart, live, add, setQuantity, remove, refresh],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
