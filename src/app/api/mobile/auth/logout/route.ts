import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { bearerToken, json } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Ends this device's session only; the website and other devices stay signed in. */
export async function POST(req: Request) {
  const token = bearerToken(req);
  if (token) await db.delete(sessions).where(eq(sessions.sessionToken, token));
  return json({ ok: true });
}
