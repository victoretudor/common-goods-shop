import { cookies } from "next/headers";
import { auth } from "@/auth";
import { MOBILE_PENDING_COOKIE as PENDING_COOKIE, signPayload, verifyPayload } from "@/lib/api";

// Mobile sign-in, step 2 of 3. The website's Google sign-in lands here. We hand the app a
// one-time code (valid 2 minutes, bound to its PKCE challenge) via its deep link.

export const dynamic = "force-dynamic";

type Pending = { typ: string; redirectUri: string; challenge: string };

function page(title: string, message: string, status = 400) {
  return new Response(
    `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<body style="font-family:system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;text-align:center;color:#1c1917">
<h1 style="font-size:20px">${title}</h1><p style="color:#57534e">${message}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: Request) {
  const jar = await cookies();
  const pending = verifyPayload<Pending>(jar.get(PENDING_COOKIE)?.value);
  if (!pending || pending.typ !== "mobile_pending") {
    return page("Sign-in expired", "Please go back to the Common Goods app and tap Sign in again.");
  }

  const session = await auth();
  if (!session?.user?.id) {
    const signIn = new URL("/signin", req.url);
    signIn.searchParams.set("callbackUrl", "/api/mobile/auth/callback");
    return Response.redirect(signIn, 302);
  }

  const code = signPayload(
    { typ: "mobile_code", userId: session.user.id, challenge: pending.challenge },
    2 * 60_000,
  );
  jar.delete({ name: PENDING_COOKIE, path: "/api/mobile/auth" });

  const sep = pending.redirectUri.includes("?") ? "&" : "?";
  const target = `${pending.redirectUri}${sep}code=${encodeURIComponent(code)}`;
  // A plain 302 to the app's custom scheme; the in-app browser hands it back to the app.
  return new Response(null, { status: 302, headers: { Location: target } });
}
