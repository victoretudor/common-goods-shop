import { apiError, getRequestUserId } from "@/lib/api";
import { getCart, getCartFingerprint } from "@/lib/cart";

// Server-Sent Events stream of the user's cart. Sends the full cart once on connect and
// again whenever it changes, from any device: website, mobile app or another tab.
//
// Vercel caps how long a function may run, so the stream ends itself before that limit;
// EventSource clients reconnect automatically (the `retry` hint below asks for 1s).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const POLL_MS = 1000;
const PING_MS = 15_000;
const STREAM_MS = 270_000;

export async function GET(req: Request) {
  const userId = await getRequestUserId(req);
  if (!userId) return apiError("Not signed in", 401);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };
      req.signal.addEventListener("abort", close);

      send("retry: 1000\n\n");
      const startedAt = Date.now();
      let lastSentAt = Date.now();
      let lastFingerprint: string | null = null;

      while (!closed && Date.now() - startedAt < STREAM_MS) {
        try {
          const fingerprint = await getCartFingerprint(userId);
          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            send(`event: cart\ndata: ${JSON.stringify(await getCart(userId))}\n\n`);
            lastSentAt = Date.now();
          } else if (Date.now() - lastSentAt > PING_MS) {
            // Comment line keeps proxies and mobile networks from dropping an idle connection
            send(": ping\n\n");
            lastSentAt = Date.now();
          }
        } catch (err) {
          console.error("cart stream poll failed", err);
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
