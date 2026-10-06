import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { FREE_SHIPPING_THRESHOLD_CENTS, formatPrice } from "@/lib/format";
import { colors, radius } from "@/theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === "primary";
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && { opacity: 0.8 },
        inactive && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.primaryText : colors.text} />
      ) : (
        <Text style={[styles.buttonText, { color: primary ? colors.primaryText : colors.text }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/** Full-screen centered message for loading, empty and error states. */
export function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

export function Loading() {
  return (
    <Centered>
      <ActivityIndicator color={colors.text} />
    </Centered>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Centered>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} style={{ marginTop: 16 }} />}
    </Centered>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <Centered>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.body}>{message}</Text>}
      {action && <View style={{ marginTop: 20, alignSelf: "stretch" }}>{action}</View>}
    </Centered>
  );
}

export function Totals({
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
    <View style={{ gap: 8 }}>
      <Row label="Subtotal" value={formatPrice(subtotalCents)} />
      <Row label="Shipping" value={shippingCents === 0 ? "Free" : formatPrice(shippingCents)} />
      {showFreeShippingHint && remaining > 0 && (
        <Text style={styles.hint}>Add {formatPrice(remaining)} more for free shipping.</Text>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total</Text>
        <Text style={styles.totalText}>{formatPrice(totalCents)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.text}>{value}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.sm,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.inputBorder },
  buttonText: { fontSize: 15, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: "600", color: colors.text, textAlign: "center" },
  body: { fontSize: 15, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 21 },
  hint: { fontSize: 12, color: colors.subtle },
  row: { flexDirection: "row", justifyContent: "space-between" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 2,
  },
  totalText: { fontSize: 17, fontWeight: "700", color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  text: { fontSize: 14, color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
  },
});
