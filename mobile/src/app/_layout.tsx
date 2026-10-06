import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.card },
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: colors.bg },
            headerBackButtonDisplayMode: "minimal",
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: "" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="order/[id]" options={{ title: "Order" }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
