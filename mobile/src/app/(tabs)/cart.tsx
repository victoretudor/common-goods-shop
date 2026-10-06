import { Image } from "expo-image";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, EmptyState, Loading, Totals } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { colors, radius } from "@/theme";

export default function CartScreen() {
  const { status } = useAuth();
  const { cart, live } = useCart();

  if (status === "loading") return <Loading />;
  if (status === "signedOut") {
    return (
      <SignInPrompt
        title="Your cart"
        message="Sign in with the same Google account you use on the website to see your cart."
      />
    );
  }
  if (!cart) return <Loading />;

  if (cart.items.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <LiveBadge live={live} />
        </View>
        <EmptyState
          title="Your cart is empty"
          message="Items you add here or on the website show up instantly."
          action={<Button title="Browse products" onPress={() => router.navigate("/")} />}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={cart.items}
      keyExtractor={(i) => String(i.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={<LiveBadge live={live} />}
      renderItem={({ item }) => <CartRow item={item} />}
      ListFooterComponent={
        <Card style={{ marginTop: 4 }}>
          <Totals
            subtotalCents={cart.subtotalCents}
            shippingCents={cart.shippingCents}
            totalCents={cart.totalCents}
          />
          <Button title="Proceed to checkout" onPress={() => router.push("/checkout")} style={{ marginTop: 16 }} />
        </Card>
      }
    />
  );
}

function LiveBadge({ live }: { live: boolean }) {
  return (
    <View style={styles.live}>
      <View style={[styles.dot, { backgroundColor: live ? "#22c55e" : colors.subtle }]} />
      <Text style={styles.liveText}>{live ? "Live: synced with the website" : "Connecting…"}</Text>
    </View>
  );
}

function CartRow({ item }: { item: CartItem }) {
  const { setQuantity, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const { product, quantity } = item;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      Alert.alert("Couldn't update cart", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={[styles.row, busy && { opacity: 0.6 }]}>
      <Link href={`/product/${product.slug}`} asChild>
        <Pressable>
          <Image source={product.imageUrl} style={styles.thumb} contentFit="cover" />
        </Pressable>
      </Link>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.lineTotal}>{formatPrice(product.priceCents * quantity)}</Text>
        </View>
        <Text style={styles.each}>{formatPrice(product.priceCents)} each</Text>
        <View style={styles.controls}>
          <View style={styles.stepper}>
            <StepButton label="−" disabled={busy} onPress={() => run(() => setQuantity(item.id, quantity - 1))} />
            <Text style={styles.qty}>{quantity}</Text>
            <StepButton
              label="+"
              disabled={busy || quantity >= product.stock}
              onPress={() => run(() => setQuantity(item.id, quantity + 1))}
            />
          </View>
          <Pressable disabled={busy} onPress={() => run(() => remove(item.id))} hitSlop={8}>
            <Text style={styles.remove}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

function StepButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label === "+" ? "Increase quantity" : "Decrease quantity"}
      style={({ pressed }) => [styles.step, pressed && { backgroundColor: colors.placeholder }, disabled && { opacity: 0.4 }]}>
      <Text style={styles.stepText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 12, color: colors.subtle },
  row: { flexDirection: "row", gap: 12, padding: 12 },
  thumb: { width: 84, height: 84, borderRadius: radius.sm, backgroundColor: colors.placeholder },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  lineTotal: { fontSize: 15, fontWeight: "600", color: colors.text },
  each: { fontSize: 13, color: colors.subtle, marginTop: 2 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.sm,
  },
  step: { paddingHorizontal: 14, paddingVertical: 6 },
  stepText: { fontSize: 18, color: colors.text },
  qty: { minWidth: 28, textAlign: "center", fontSize: 15, color: colors.text },
  remove: { fontSize: 14, color: colors.subtle },
});
