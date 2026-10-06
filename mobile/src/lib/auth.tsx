import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, ApiError, setApiToken, setUnauthorizedHandler } from "./api";
import { API_URL } from "./config";
import type { User } from "./types";

// Sign-in goes through the website's own Google sign-in, so the app always ends up on the
// same account (same user row, cart and orders) as the website.
//
//   1. The app opens  /api/mobile/auth/start  in a secure in-app browser, with a PKCE challenge.
//   2. The user signs in with Google on the website (instant if already signed in there).
//   3. The website redirects back to the app with a one-time code.
//   4. The app swaps code + PKCE verifier for a session token at /api/mobile/auth/token.

const TOKEN_KEY = "commongoods.session";
const USER_KEY = "commongoods.user";

type Status = "loading" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: Status;
  user: User | null;
  token: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function base64UrlFromBase64(b64: string) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    setApiToken(null);
    setToken(null);
    setUser(null);
    setStatus("signedOut");
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
  }, []);

  const saveSession = useCallback(async (newToken: string, newUser: User) => {
    setApiToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setStatus("signedIn");
    await SecureStore.setItemAsync(TOKEN_KEY, newToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(newUser));
  }, []);

  // Restore a saved session on launch, then confirm it with the server.
  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession());
    (async () => {
      const saved = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!saved) return setStatus("signedOut");
      const savedUser = await SecureStore.getItemAsync(USER_KEY);
      setApiToken(saved);
      setToken(saved);
      setUser(savedUser ? JSON.parse(savedUser) : null);
      setStatus("signedIn");
      try {
        const { user: fresh } = await api<{ user: User }>("/api/me");
        setUser(fresh);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
      } catch (err) {
        // 401 is handled by the unauthorized handler; offline keeps the saved session.
        if (!(err instanceof ApiError)) console.warn(err);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(async () => {
    const verifier = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, "");
    const challenge = base64UrlFromBase64(
      await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
        encoding: Crypto.CryptoEncoding.BASE64,
      }),
    );
    // commongoods://auth in a build, exp://…/--/auth in Expo Go
    const redirectUri = Linking.createURL("auth");
    const startUrl =
      `${API_URL}/api/mobile/auth/start?redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge=${challenge}`;

    const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);
    if (result.type !== "success") return false;

    const code = Linking.parse(result.url).queryParams?.code;
    if (typeof code !== "string") throw new Error("Sign-in didn't return a code.");

    const session = await api<{ token: string; user: User }>("/api/mobile/auth/token", "POST", {
      code,
      code_verifier: verifier,
    });
    await saveSession(session.token, session.user);
    return true;
  }, [saveSession]);

  const signOut = useCallback(async () => {
    // Ends only this device's session; the website stays signed in.
    await api("/api/mobile/auth/logout", "POST").catch(() => {});
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ status, user, token, signIn, signOut }),
    [status, user, token, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
