import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

type AdapterTables = NonNullable<Parameters<typeof DrizzleAdapter<typeof db>>[1]>;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // .enableRLS() strips the method from the table's type, which the adapter's
  // types still expect; the table objects themselves are what it needs.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as unknown as AdapterTables),
  providers: [Google],
  session: { strategy: "database" },
  pages: { signIn: "/signin" },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
