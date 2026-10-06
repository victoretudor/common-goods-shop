import { NextResponse } from "next/server";
import { apiError, MOBILE_PENDING_COOKIE, signPayload } from "@/lib/api";

// Mobile sign-in, step 1 of 3. The app opens this URL in a secure in-app browser with:
//   redirect_uri    where to send the user back (the app's deep link)
//   code_challenge  PKCE S256 challenge; only the app knows the matching verifier
// We remember both in a short-lived signed cookie and send the user through the website's
// normal Google sign-in, so the app ends up on exactly the same account as the website.

export const dynamic = "force-dynamic";

// commongoods:// is the app's own scheme; exp:// and exps:// are Expo Go during development.
const ALLOWED_REDIRECT = /^(commongoods|exp|exps):\/\//;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

const PENDING_COOKIE = MOBILE_PENDING_COOKIE;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const challenge = url.searchParams.get("code_challenge") ?? "";

  if (!ALLOWED_REDIRECT.test(redirectUri)) return apiError("Invalid redirect_uri", 400);
  if (!CHALLENGE.test(challenge)) return apiError("Invalid code_challenge", 400);

  const pending = signPayload({ typ: "mobile_pending", redirectUri, challenge }, 10 * 60_000);

  const signIn = new URL("/signin", url);
  signIn.searchParams.set("callbackUrl", "/api/mobile/auth/callback");
  const res = NextResponse.redirect(signIn);
  res.cookies.set(PENDING_COOKIE, pending, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/mobile/auth",
    maxAge: 600,
  });
  return res;
}
