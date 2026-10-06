import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, createMobileSession, json, pkceChallenge, verifyPayload } from "@/lib/api";

// Mobile sign-in, step 3 of 3. The app swaps the one-time code plus its PKCE verifier for a
// long-lived session token (a row in the same `session` table the website uses).

export const dynamic = "force-dynamic";

type Code = { typ: string; userId: string; challenge: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = verifyPayload<Code>(body?.code);
  const verifier = typeof body?.code_verifier === "string" ? body.code_verifier : "";

  if (!code || code.typ !== "mobile_code") return apiError("Invalid or expired code", 400);

  const expected = Buffer.from(code.challenge);
  const actual = Buffer.from(pkceChallenge(verifier));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return apiError("Invalid code_verifier", 400);
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, code.userId) });
  if (!user) return apiError("User not found", 400);

  const { token, expires } = await createMobileSession(user.id);
  return json({
    token,
    expiresAt: expires.toISOString(),
    user: { id: user.id, name: user.name, email: user.email, image: user.image },
  });
}
