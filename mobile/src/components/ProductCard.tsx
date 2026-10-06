import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { colors, radius } from "@/theme";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
        <View>
          <Image source={product.imageUrl} style={styles.image} contentFit="cover" transition={150} />
          {product.stock === 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Sold out</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.price}>{formatPrice(product.priceCents)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  image: { width: "100%", aspectRatio: 1, backgroundColor: colors.placeholder },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  body: { padding: 12, gap: 3 },
  category: { fontSize: 10, letterSpacing: 0.6, color: colors.subtle },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  price: { fontSize: 14, color: colors.muted },
});
