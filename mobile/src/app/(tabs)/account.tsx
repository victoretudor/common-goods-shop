import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SignInPrompt } from "@/components/SignInPrompt";
import { Button, Card, Loading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { API_URL } from "@/lib/config";
import { colors } from "@/theme";

export default function AccountScreen() {
  const { status, user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (status === "loading") return <Loading />;
  if (status === "signedOut") {
    return (
      <SignInPrompt
        title="Sign in to Common Goods"
        message="Use the same Google account as on the website. Your cart and orders are shared between the two."
      />
    );
  }

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <Card style={styles.profile}>
        {user?.image ? (
          <Image source={user.image} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>{(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.name ?? "Signed in"}</Text>
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>
      </Card>

      <Text style={styles.note}>
        You're signed in with the same account as the website. Items you add to your cart on either one
        appear on the other instantly.
      </Text>

      <Button
        title="Open the website"
        variant="secondary"
        onPress={() => WebBrowser.openBrowserAsync(API_URL)}
      />
      <Button
        title="Sign out"
        variant="secondary"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: { backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  initial: { color: "#fff", fontSize: 22, fontWeight: "600" },
  name: { fontSize: 17, fontWeight: "600", color: colors.text },
  email: { fontSize: 14, color: colors.subtle, marginTop: 2 },
  note: { fontSize: 13, color: colors.subtle, lineHeight: 19, paddingHorizontal: 4 },
});
