"use client";

import { useActionState } from "react";
import { placeOrder, type CheckoutState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

type FieldName = keyof NonNullable<CheckoutState["fieldErrors"]>;

function Field({
  name,
  label,
  state,
  type = "text",
  autoComplete,
  defaultValue,
  optional,
  className = "",
}: {
  name: FieldName;
  label: string;
  state: CheckoutState;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  optional?: boolean;
  className?: string;
}) {
  const error = state.fieldErrors?.[name]?.[0];
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-stone-500">(optional)</span>}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        // React resets forms after an action; re-fill with what was submitted
        defaultValue={state.values?.[name] ?? defaultValue}
        required={!optional}
        aria-invalid={!!error}
        className={`input ${error ? "border-red-500" : ""}`}
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

export function CheckoutForm({
  defaultEmail,
  defaultName,
  totalLabel,
}: {
  defaultEmail: string;
  defaultName: string;
  totalLabel: string;
}) {
  const [state, formAction] = useActionState(placeOrder, {});

  return (
    <form action={formAction} className="space-y-8">
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field state={state} name="email" label="Email" type="email" autoComplete="email" defaultValue={defaultEmail} />
          <Field state={state} name="phone" label="Phone" type="tel" autoComplete="tel" optional />
        </div>
        <p className="mt-3 text-xs text-stone-500">Your order confirmation will be sent to this email.</p>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Shipping address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field state={state} name="fullName" label="Full name" autoComplete="name" defaultValue={defaultName} className="sm:col-span-2" />
          <Field state={state} name="addressLine1" label="Address" autoComplete="address-line1" className="sm:col-span-2" />
          <Field state={state} name="addressLine2" label="Apartment, suite, etc." autoComplete="address-line2" optional className="sm:col-span-2" />
          <Field state={state} name="city" label="City" autoComplete="address-level2" />
          <Field state={state} name="state" label="State / Region" autoComplete="address-level1" optional />
          <Field state={state} name="postalCode" label="Postal code" autoComplete="postal-code" />
          <Field state={state} name="country" label="Country" autoComplete="country-name" />
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">Payment</h2>
        <p className="text-sm text-stone-600">Pay on delivery. You won&apos;t be charged online.</p>
      </section>

      <SubmitButton className="btn-primary w-full py-3 text-base" pendingText="Placing order…">
        Place order · {totalLabel}
      </SubmitButton>
    </form>
  );
}
