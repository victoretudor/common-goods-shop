import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { ProductCard } from "@/components/ProductCard";
import { ErrorState, Loading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { colors, radius } from "@/theme";

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ products: Product[] }>("/api/products");
      setProducts(data.products);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load products.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !products) return <ErrorState message={error} onRetry={load} />;
  if (!products) return <Loading />;

  return (
    <FlatList
      data={products}
      keyExtractor={(p) => String(p.id)}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => <ProductCard product={item} />}
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
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>NEW SEASON</Text>
          <Text style={styles.heroTitle}>Everyday goods, made to last.</Text>
          <Text style={styles.heroBody}>Free shipping on orders over $50.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.text, borderRadius: radius.lg, padding: 20, marginBottom: 4 },
  eyebrow: { color: "#fdba74", fontSize: 11, fontWeight: "600", letterSpacing: 1.5 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 6 },
  heroBody: { color: "#d6d3d1", fontSize: 14, marginTop: 6 },
});
