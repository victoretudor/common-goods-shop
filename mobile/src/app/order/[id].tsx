import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Card, ErrorState, Loading, Totals } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import { colors, radius } from "@/theme";

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const [data, setData] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<{ order: Order; items: OrderItem[] }>(`/api/orders/${id}`));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this order.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Loading />;
  const { order, items } = data;

  return (
    <>
      <Stack.Screen options={{ title: `Order #${order.id}` }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {placed && (
          <View style={styles.success}>
            <Text style={styles.successTitle}>Thank you! Your order is confirmed.</Text>
            <Text style={styles.successBody}>
              {order.confirmationEmailSentAt
                ? `A confirmation email has been sent to ${order.email}.`
                : "We couldn't send the confirmation email right now, but your order has been saved."}
            </Text>
          </View>
        )}

        <Card style={{ gap: 14 }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Order #{order.id}</Text>
              <Text style={styles.sub}>Placed {formatDate(order.createdAt)}</Text>
            </View>
            <Text style={styles.status}>{order.status}</Text>
          </View>

          <View style={styles.items}>
            {items.map((i) => (
              <View key={i.id} style={styles.line}>
                <Text style={styles.lineText} numberOfLines={2}>
                  {i.name} <Text style={styles.sub}>× {i.quantity}</Text>
                </Text>
                <Text style={styles.lineText}>{formatPrice(i.unitPriceCents * i.quantity)}</Text>
              </View>
            ))}
          </View>

          <Totals
            subtotalCents={order.subtotalCents}
            shippingCents={order.shippingCents}
            totalCents={order.totalCents}
            showFreeShippingHint={false}
          />
        </Card>

        <Card style={{ gap: 6 }}>
          <Text style={styles.section}>Shipping to</Text>
          <Text style={styles.address}>
            {[
              order.fullName,
              order.addressLine1,
              order.addressLine2,
              [order.city, order.state, order.postalCode].filter(Boolean).join(", "),
              order.country,
            ]
              .filter(Boolean)
              .join("\n")}
          </Text>
          <Text style={[styles.section, { marginTop: 10 }]}>Contact</Text>
          <Text style={styles.address}>{[order.email, order.phone].filter(Boolean).join("\n")}</Text>
        </Card>

        {placed && <Button title="Continue shopping" variant="secondary" onPress={() => router.navigate("/")} />}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  success: {
    backgroundColor: colors.successBg,
    borderColor: "#bbf7d0",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 4,
  },
  successTitle: { fontSize: 16, fontWeight: "600", color: "#14532d" },
  successBody: { fontSize: 14, color: "#166534", lineHeight: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  sub: { fontSize: 13, color: colors.subtle },
  status: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.placeholder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  items: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 8,
    gap: 8,
  },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  lineText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  section: { fontSize: 15, fontWeight: "600", color: colors.text },
  address: { fontSize: 14, color: colors.muted, lineHeight: 21 },
});
