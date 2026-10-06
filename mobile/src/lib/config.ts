// The website the app talks to. Both share the same API, database and accounts.
// Override with EXPO_PUBLIC_API_URL (e.g. in mobile/.env) to point at another deployment.
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://common-goods-shop.vercel.app"
).replace(/\/$/, "");
