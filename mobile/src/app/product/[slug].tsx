import { Image } from "expo-image";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSignIn } from "@/components/SignInPrompt";
import { Button, ErrorState, Loading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { colors, radius } from "@/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { status } = useAuth();
  const { cart, add } = useCart();
  const { signIn } = useSignIn();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setProduct((await api<{ product: Product }>(`/api/products/${slug}`)).product);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this product.");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!product) return <Loading />;

  const inStock = product.stock > 0;
  const inCart = cart?.items.find((i) => i.product.id === product.id)?.quantity ?? 0;

  const onAdd = async () => {
    if (status !== "signedIn" && !(await signIn())) return;
    setAdding(true);
    try {
      await add(product.id);
    } catch (err) {
      Alert.alert("Couldn't add to cart", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Image source={product.imageUrl} style={styles.image} contentFit="cover" transition={150} />
        <View style={styles.body}>
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
          <Text style={styles.description}>{product.description}</Text>
          <Text style={[styles.stock, { color: inStock ? colors.success : colors.danger }]}>
            {inStock ? (product.stock <= 5 ? `Only ${product.stock} left` : "In stock") : "Sold out"}
          </Text>

          <Button
            title={inStock ? "Add to cart" : "Sold out"}
            onPress={onAdd}
            loading={adding}
            disabled={!inStock}
            style={{ marginTop: 16 }}
          />
          {inCart > 0 && (
            <View style={styles.inCart}>
              <Text style={styles.inCartText}>{inCart} in your cart · </Text>
              <Link href="/cart" style={styles.link}>
                View cart
              </Link>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.placeholder },
  body: { padding: 20 },
  category: { fontSize: 12, letterSpacing: 0.8, color: colors.subtle },
  name: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: 4 },
  price: { fontSize: 20, color: colors.text, marginTop: 8 },
  description: { fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: 16 },
  stock: { fontSize: 14, marginTop: 16 },
  inCart: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
    padding: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.successBg,
  },
  inCartText: { color: colors.success, fontSize: 14 },
  link: { color: colors.success, fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
