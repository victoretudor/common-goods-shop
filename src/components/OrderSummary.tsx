import { FREE_SHIPPING_THRESHOLD_CENTS, formatPrice } from "@/lib/format";

export function OrderSummary({
  subtotalCents,
  shippingCents,
  totalCents,
  showFreeShippingHint = true,
}: {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  showFreeShippingHint?: boolean;
}) {
  const remaining = FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-stone-600">Subtotal</dt>
        <dd>{formatPrice(subtotalCents)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-stone-600">Shipping</dt>
        <dd>{shippingCents === 0 ? "Free" : formatPrice(shippingCents)}</dd>
      </div>
      {showFreeShippingHint && remaining > 0 && (
        <p className="text-xs text-stone-500">
          Add {formatPrice(remaining)} more for free shipping.
        </p>
      )}
      <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatPrice(totalCents)}</dd>
      </div>
    </dl>
  );
}
