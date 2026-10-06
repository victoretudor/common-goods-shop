# Common Goods: mobile app

An Expo (React Native) app for the Common Goods shop. It uses the **same API, database and accounts** as the website at <https://common-goods-shop.vercel.app>.

- **One account:** sign in with Google through the website's own sign-in, so the app and the website share one user, cart and set of orders.
- **Live cart:** an item added on the website appears in the app's cart within about a second, with no refresh. This works both ways.
- **Screens:** shop, product details, cart, checkout (pay on delivery), order history, order details and account.

## Run it on your phone

1. Install **Expo Go** from the App Store or Google Play.
2. From this folder:

   ```bash
   npm install
   npx expo start
   ```

3. Scan the QR code. On Android, use Expo Go; on iOS, use the Camera app.
4. Go to **Account → Continue with Google**, and sign in with the same Google account you use on the website.
   - While the Google app is in **Testing** mode, the account must be listed as a test user in Google Cloud Console.

If your phone isn't on the same Wi-Fi as your computer, run `npx expo start --tunnel` instead.

### Try the live cart

1. Open the **Cart** tab in the app. You should see **"Live: synced with the website"**.
2. On a computer, open the website, sign in with the same account and add a product.
3. The item appears in the app, and the cart badge updates, without touching the phone.

## Configuration

The app talks to `https://common-goods-shop.vercel.app` by default. To point it at another deployment, create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://your-deployment.vercel.app
```

The phone must be able to reach that address, so `localhost` won't work. Google sign-in only works on domains registered in your Google OAuth client.

## How it works

### Sign-in (same account as the website)

```
App                                 Website (Next.js)                        Google
 |-- open in-app browser ---------> /api/mobile/auth/start
 |   (redirect_uri, PKCE challenge)    remembers both in a signed cookie
 |                                     -> /signin -> "Continue with Google" -----> sign in
 |                                     <- /api/auth/callback/google <------------- 
 |                                  /api/mobile/auth/callback
 | <-- commongoods://auth?code=… --    one-time code, valid 2 min, tied to the PKCE challenge
 |-- POST /api/mobile/auth/token -->   checks the code + PKCE verifier
 | <-- { token, user } ------------    creates a row in the same `session` table the website uses
```

The app stores the token in the device's secure storage (`expo-secure-store`) and sends it as `Authorization: Bearer <token>`. If you're already signed in to the website in the phone's browser, sign-in skips Google entirely. Signing out of the app ends only that device's session.

### Live cart

The app keeps a Server-Sent Events connection to `GET /api/cart/stream`. The server checks a small summary of the cart about once a second and pushes the full cart whenever it changes, whether the change came from the website, the app or another device. The connection closes when the app goes to the background and reopens when it returns. Vercel limits how long a request can stay open, so the server ends each stream after about 4½ minutes and the app reconnects within a second.

## Project layout

```
src/app/(tabs)/        Shop, Cart, Orders, Account tabs
src/app/product/[slug] Product details
src/app/checkout.tsx   Checkout
src/app/order/[id]     Order details / confirmation
src/app/auth.tsx       Landing route for the sign-in deep link
src/lib/api.ts         API client (adds the Bearer token)
src/lib/auth.tsx       Sign-in (PKCE handshake), secure token storage
src/lib/cart.tsx       Cart state and the live connection
```

## Building a standalone app

Expo Go is enough for development and demos. To produce an installable app, use EAS Build:

```bash
npm install -g eas-cli
eas build --platform android   # or ios
```

The app's URL scheme is `commongoods://`, and the website already accepts it as a sign-in redirect.
