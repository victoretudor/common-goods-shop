import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useCart } from "@/lib/cart";
import { colors } from "@/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const { cart } = useCart();
  const count = cart?.count ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.subtle,
        headerTitleStyle: { fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Shop", headerTitle: "Common Goods", tabBarIcon: icon("storefront-outline") }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: icon("bag-outline"),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: icon("receipt-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}
