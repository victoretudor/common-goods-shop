import { router } from "expo-router";
import { useEffect } from "react";

import { Loading } from "@/components/ui";

// The website sends the user back to commongoods://auth?code=… after Google sign-in.
// The in-app browser normally hands that URL straight to the sign-in code, but on some
// Android devices it also opens as a deep link. This screen just steps back out of the way.
export default function AuthRedirect() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);
  return <Loading />;
}
