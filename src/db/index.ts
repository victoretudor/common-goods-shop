import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "";
// `next build` imports this module without querying, so only enforce it at runtime
if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.pg ??
  postgres(url, {
    // Supabase's transaction pooler (port 6543) doesn't support prepared statements
    prepare: false,
    // Supabase requires TLS; allow plain connections only for a local database
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    max: 5,
  });

// Reuse the connection across hot reloads in dev
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
