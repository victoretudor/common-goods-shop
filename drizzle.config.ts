import { defineConfig } from "drizzle-kit";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env.local");
} catch {
  // No .env.local — fall back to the real environment
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations go through Supabase's session pooler; the transaction pooler
  // used by the app doesn't handle DDL and prepared statements well.
  dbCredentials: { url: (process.env.DIRECT_URL || process.env.DATABASE_URL)! },
});
