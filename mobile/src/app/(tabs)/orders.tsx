import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { colors } from "@/theme";

export default function OrdersScreen() {
  const { status } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (status !== "signedIn") return;
    try {
      setOrders((await api<{ orders: Order[] }>("/api/orders")).orders);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your orders.");
    }
  }, [status]);

  // Reload whenever the tab is shown, so orders placed on the website appear too.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status === "loading") return <Loading />;
  if (status === "signedOut") {
    return <SignInPrompt title="Your orders" message="Sign in to see orders from the app and the website." />;
  }
  if (error && !orders) return <ErrorState message={error} onRetry={load} />;
  if (!orders) return <Loading />;
  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        message="Orders you place here or on the website appear here."
        action={<Button title="Start shopping" onPress={() => router.navigate("/")} />}
      />
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => String(o.id)}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: "/order/[id]", params: { id: String(item.id) } }} asChild>
          <Pressable>
            {({ pressed }) => (
              <Card style={[styles.row, pressed && { opacity: 0.8 }]}>
                <View>
                  <Text style={styles.title}>Order #{item.id}</Text>
                  <Text style={styles.sub}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.title}>{formatPrice(item.totalCents)}</Text>
                  <Text style={[styles.sub, { textTransform: "capitalize" }]}>{item.status}</Text>
                </View>
              </Card>
            )}
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  sub: { fontSize: 13, color: colors.subtle, marginTop: 2 },
});
