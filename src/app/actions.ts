"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import {
  addCartItem,
  checkoutSchema,
  placeOrder as placeOrderForUser,
  removeCartItem,
  setCartItemQuantity,
  ShopError,
  type CheckoutField,
} from "@/lib/shop";

async function requireUserId(callbackUrl: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user.id;
}

// ---------- Auth ----------

export async function signInWithGoogle(formData: FormData) {
  const callbackUrl = String(formData.get("callbackUrl") || "/");
  // Only allow same-site redirects
  await signIn("google", { redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

// ---------- Cart ----------

export async function addToCart(formData: FormData) {
  const productId = Number(formData.get("productId"));
  const returnTo = String(formData.get("returnTo") || "/");
  const userId = await requireUserId(returnTo);

  try {
    await addCartItem(userId, productId);
  } catch (err) {
    if (err instanceof ShopError) return;
    throw err;
  }

  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function updateCartQuantity(formData: FormData) {
  const itemId = Number(formData.get("itemId"));
  const quantity = Number(formData.get("quantity"));
  const userId = await requireUserId("/cart");
  try {
    await setCartItemQuantity(userId, itemId, quantity);
  } catch (err) {
    if (!(err instanceof ShopError)) throw err;
  }
  revalidatePath("/", "layout");
}

export async function removeFromCart(formData: FormData) {
  const itemId = Number(formData.get("itemId"));
  const userId = await requireUserId("/cart");
  await removeCartItem(userId, itemId);
  revalidatePath("/", "layout");
}

// ---------- Checkout ----------

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<CheckoutField, string[]>>;
  values?: Partial<Record<CheckoutField, string>>;
};

export async function placeOrder(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const userId = await requireUserId("/checkout");

  const values = Object.fromEntries(
    Object.keys(checkoutSchema.shape).map((k) => [k, String(formData.get(k) ?? "")]),
  ) as Record<CheckoutField, string>;

  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }

  let orderId: number;
  try {
    ({ orderId } = await placeOrderForUser(userId, parsed.data));
  } catch (err) {
    if (err instanceof ShopError) return { error: err.message, values };
    console.error("placeOrder failed", err);
    return { error: "Something went wrong placing your order. Please try again.", values };
  }

  revalidatePath("/", "layout");
  redirect(`/orders/${orderId}?placed=1`);
}
