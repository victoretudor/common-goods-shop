import { useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "@/lib/auth";
import { Button, EmptyState } from "./ui";

export function useSignIn() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      return await signIn();
    } catch (err) {
      Alert.alert("Sign-in failed", err instanceof Error ? err.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { signIn: run, busy };
}

export function SignInPrompt({ title, message }: { title: string; message: string }) {
  const { signIn, busy } = useSignIn();
  return (
    <EmptyState
      title={title}
      message={message}
      action={<Button title="Continue with Google" onPress={signIn} loading={busy} />}
    />
  );
}
