import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, EmptyState, Loading, Totals } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { CheckoutDetails } from "@/lib/types";
import { colors, radius } from "@/theme";

type Field = keyof CheckoutDetails;

export default function CheckoutScreen() {
  const { status, user } = useAuth();
  const { cart } = useCart();
  const [values, setValues] = useState<Record<Field, string>>({
    email: user?.email ?? "",
    fullName: user?.name ?? "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  if (status === "signedOut") {
    return <SignInPrompt title="Checkout" message="Sign in to place your order." />;
  }
  if (!cart) return <Loading />;
  if (cart.items.length === 0 && !placing) {
    return (
      <EmptyState
        title="Your cart is empty"
        action={<Button title="Browse products" onPress={() => router.navigate("/")} />}
      />
    );
  }

  const field = (name: Field, label: string, props: TextInputProps & { optional?: boolean } = {}) => {
    const { optional, ...inputProps } = props;
    const err = fieldErrors[name];
    return (
      <View style={{ gap: 6, flex: 1 }}>
        <Text style={styles.label}>
          {label}
          {optional && <Text style={styles.optional}> (optional)</Text>}
        </Text>
        <TextInput
          value={values[name]}
          onChangeText={(text) => {
            setValues((v) => ({ ...v, [name]: text }));
            if (err) setFieldErrors((e) => ({ ...e, [name]: undefined }));
          }}
          style={[styles.input, err && { borderColor: colors.danger }]}
          placeholderTextColor={colors.subtle}
          {...inputProps}
        />
        {err && <Text style={styles.fieldError}>{err}</Text>}
      </View>
    );
  };

  const placeOrder = async () => {
    setPlacing(true);
    setError(null);
    try {
      const { orderId } = await api<{ orderId: number; emailSent: boolean }>(
        "/api/orders",
        "POST",
        values,
      );
      router.dismissAll();
      router.push({ pathname: "/order/[id]", params: { id: String(orderId), placed: "1" } });
    } catch (err) {
      setPlacing(false);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(
          Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v?.[0]])),
        );
      }
      setError(err instanceof Error ? err.message : "Couldn't place your order.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.error}>{error}</Text>}

        <Card style={{ gap: 14 }}>
          <Text style={styles.section}>Contact</Text>
          {field("email", "Email", { keyboardType: "email-address", autoCapitalize: "none", autoComplete: "email" })}
          {field("phone", "Phone", { keyboardType: "phone-pad", autoComplete: "tel", optional: true })}
          <Text style={styles.hint}>Your order confirmation will be sent to this email.</Text>
        </Card>

        <Card style={{ gap: 14 }}>
          <Text style={styles.section}>Shipping address</Text>
          {field("fullName", "Full name", { autoComplete: "name" })}
          {field("addressLine1", "Address", { autoComplete: "address-line1" })}
          {field("addressLine2", "Apartment, suite, etc.", { autoComplete: "address-line2", optional: true })}
          <View style={styles.pair}>
            {field("city", "City", { autoComplete: "postal-address-locality" })}
            {field("state", "State / Region", { autoComplete: "postal-address-region", optional: true })}
          </View>
          <View style={styles.pair}>
            {field("postalCode", "Postal code", { autoComplete: "postal-code" })}
            {field("country", "Country", { autoComplete: "postal-address-country" })}
          </View>
        </Card>

        <Card style={{ gap: 6 }}>
          <Text style={styles.section}>Payment</Text>
          <Text style={styles.hint}>Pay on delivery. You won't be charged online.</Text>
        </Card>

        <Card style={{ gap: 12 }}>
          <Text style={styles.section}>Order summary</Text>
          {cart.items.map((i) => (
            <View key={i.id} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {i.product.name} × {i.quantity}
              </Text>
              <Text style={styles.lineName}>{formatPrice(i.product.priceCents * i.quantity)}</Text>
            </View>
          ))}
          <Totals subtotalCents={cart.subtotalCents} shippingCents={cart.shippingCents} totalCents={cart.totalCents} />
        </Card>

        <Button title={`Place order · ${formatPrice(cart.totalCents)}`} onPress={placeOrder} loading={placing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: "600", color: colors.text },
  label: { fontSize: 14, fontWeight: "500", color: colors.text },
  optional: { fontWeight: "400", color: colors.subtle },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: "#fff",
  },
  fieldError: { fontSize: 12, color: colors.danger },
  hint: { fontSize: 13, color: colors.subtle },
  pair: { flexDirection: "row", gap: 12 },
  error: {
    backgroundColor: colors.dangerBg,
    color: colors.danger,
    padding: 12,
    borderRadius: radius.sm,
    fontSize: 14,
  },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineName: { fontSize: 14, color: colors.text, flexShrink: 1 },
});
