import type { Order, OrderItem } from "@/db/schema";
import { formatPrice } from "./format";

type SendArgs = { to: string; subject: string; text: string; html: string };

async function sendMail({ to, subject, text, html }: SendArgs) {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    throw new Error("Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN)");
  }
  const base = process.env.MAILGUN_API_BASE ?? "https://api.mailgun.net";
  const from = process.env.MAILGUN_FROM ?? `Shop <orders@${domain}>`;

  const body = new URLSearchParams({ from, to, subject, text, html });
  const res = await fetch(`${base}/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Mailgun responded ${res.status}: ${await res.text()}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export async function sendOrderConfirmation(order: Order, items: OrderItem[]) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const orderUrl = `${appUrl}/orders/${order.id}`;
  const address = [
    order.addressLine1,
    order.addressLine2,
    [order.city, order.state, order.postalCode].filter(Boolean).join(", "),
    order.country,
  ].filter(Boolean) as string[];

  const text = [
    `Hi ${order.fullName},`,
    ``,
    `Thanks for your order! Here's your summary for order #${order.id}:`,
    ``,
    ...items.map(
      (i) => `  ${i.quantity} x ${i.name} — ${formatPrice(i.unitPriceCents * i.quantity)}`,
    ),
    ``,
    `Subtotal: ${formatPrice(order.subtotalCents)}`,
    `Shipping: ${order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}`,
    `Total:    ${formatPrice(order.totalCents)}`,
    ``,
    `Shipping to:`,
    ...address.map((l) => `  ${l}`),
    ``,
    `View your order: ${orderUrl}`,
  ].join("\n");

  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0">${escapeHtml(i.name)} &times; ${i.quantity}</td>
        <td style="padding:8px 0;text-align:right">${formatPrice(i.unitPriceCents * i.quantity)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 8px;font-size:22px">Thanks for your order!</h1>
    <p style="margin:0 0 24px;color:#57534e">Hi ${escapeHtml(order.fullName)}, we've received order <strong>#${order.id}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows}
      <tr><td colspan="2" style="border-top:1px solid #e7e5e4;padding-top:8px"></td></tr>
      <tr><td style="color:#57534e">Subtotal</td><td style="text-align:right">${formatPrice(order.subtotalCents)}</td></tr>
      <tr><td style="color:#57534e">Shipping</td><td style="text-align:right">${order.shippingCents === 0 ? "Free" : formatPrice(order.shippingCents)}</td></tr>
      <tr><td style="padding-top:8px;font-weight:600">Total</td><td style="padding-top:8px;text-align:right;font-weight:600">${formatPrice(order.totalCents)}</td></tr>
    </table>
    <h2 style="margin:24px 0 8px;font-size:15px">Shipping to</h2>
    <p style="margin:0;font-size:14px;line-height:1.5;color:#57534e">${address.map(escapeHtml).join("<br>")}</p>
    <p style="margin:32px 0 0"><a href="${orderUrl}" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">View your order</a></p>
  </div>
</body></html>`;

  await sendMail({
    to: order.email,
    subject: `Order #${order.id} confirmed`,
    text,
    html,
  });
}
