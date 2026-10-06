import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, json, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = withUser(async (_req, userId) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return apiError("Not signed in", 401);
  return json({ user: { id: user.id, name: user.name, email: user.email, image: user.image } });
});
