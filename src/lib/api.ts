import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ShopError } from "./shop";

// ---------- Authentication ----------

/**
 * Resolves the signed-in user for an API request. Mobile clients send
 * `Authorization: Bearer <token>`; the website sends its Auth.js session cookie.
 * Both are rows in the same `session` table, so they map to the same user.
 */
export async function getRequestUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (!token) return null;
    const [row] = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.sessionToken, token), gt(sessions.expires, new Date())))
      .limit(1);
    return row?.userId ?? null;
  }
  const session = await auth();
  return session?.user?.id ?? null;
}

export function bearerToken(req: Request) {
  const header = req.headers.get("authorization");
  return header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

const MOBILE_SESSION_DAYS = 90;

/** Creates a session row for a mobile device and returns its token. */
export async function createMobileSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + MOBILE_SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ sessionToken: token, userId, expires });
  return { token, expires };
}

// ---------- Signed, short-lived values (mobile sign-in handshake) ----------

/** Cookie holding the app's redirect URI and PKCE challenge while the user signs in. */
export const MOBILE_PENDING_COOKIE = "mobile_auth";

function hmac(data: string) {
  return createHmac("sha256", process.env.AUTH_SECRET!).update(data).digest("base64url");
}

export function signPayload(payload: Record<string, unknown>, ttlMs: number) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString(
    "base64url",
  );
  return `${body}.${hmac(body)}`;
}

export function verifyPayload<T extends Record<string, unknown>>(value: string | undefined | null) {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(hmac(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data as T & { exp: number };
  } catch {
    return null;
  }
}

/** PKCE S256: base64url(sha256(verifier)) */
export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

// ---------- Responses ----------

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(message: string, status: number, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, status);
}

type Handler<C> = (req: Request, userId: string, ctx: C) => Promise<Response>;

/** Wraps an API handler: requires a signed-in user and turns known errors into JSON responses. */
export function withUser<C>(handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    try {
      const userId = await getRequestUserId(req);
      if (!userId) return apiError("Not signed in", 401);
      return await handler(req, userId, ctx);
    } catch (err) {
      if (err instanceof ShopError) return apiError(err.message, err.status);
      if (err instanceof z.ZodError) {
        return apiError("Please check the highlighted fields.", 422, {
          fieldErrors: err.flatten().fieldErrors,
        });
      }
      console.error(err);
      return apiError("Something went wrong. Please try again.", 500);
    }
  };
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new ShopError("Request body must be JSON.");
  }
}
