# Common Goods: a small shop

A full-stack shop built with Next.js (App Router), plus a companion **mobile app** in [mobile/](mobile/README.md) that uses the same API and accounts.

- **Database:** **Supabase** Postgres, through Drizzle ORM. It stores users, Google accounts, sessions, products, carts, orders and order items.
- **Auth:** **Google** sign-in with Auth.js (NextAuth v5). Sessions are stored in the database.
- **Email:** order confirmation emails sent through the **Mailgun** API.
- **Checkout:** a shipping and contact form. Placing an order reserves stock in a database transaction, saves the order, empties the cart and sends the confirmation email.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Product catalogue |
| `/products/[slug]` | Product details and "Add to cart" |
| `/cart` | Cart with quantity controls and totals (sign-in required) |
| `/checkout` | Contact and shipping form, plus order summary (sign-in required) |
| `/orders`, `/orders/[id]` | Order history and order details |
| `/signin` | Google sign-in |

Payment is **pay on delivery**: there is no payment processor. Shipping is a flat $5, and free on orders over $50.

## API

The mobile app uses these endpoints. The website's pages and server actions call the same logic in [src/lib/shop.ts](src/lib/shop.ts), so both behave identically.

Signed-in endpoints accept either the website's session cookie or `Authorization: Bearer <token>` from the mobile app. Both are rows in the same `session` table, so they resolve to the same user.

| Method & path | Auth | What it does |
| --- | --- | --- |
| `GET /api/products` | — | All products |
| `GET /api/products/:slug` | — | One product |
| `GET /api/me` | ✓ | The signed-in user |
| `GET /api/cart` | ✓ | The cart, with totals |
| `POST /api/cart/items` | ✓ | Add to cart: `{ productId, quantity? }`. Returns the cart. |
| `PATCH /api/cart/items/:id` | ✓ | Set quantity: `{ quantity }` (0 removes). Returns the cart. |
| `DELETE /api/cart/items/:id` | ✓ | Remove an item. Returns the cart. |
| `GET /api/cart/stream` | ✓ | **Live cart** (Server-Sent Events): a `cart` event on connect and on every change |
| `GET /api/orders` | ✓ | Order history |
| `POST /api/orders` | ✓ | Checkout: contact and shipping details. Returns `{ orderId, emailSent }`. |
| `GET /api/orders/:id` | ✓ | One order with its items |
| `GET /api/mobile/auth/start` | — | Mobile sign-in, step 1 (see [mobile/README.md](mobile/README.md#how-it-works)) |
| `GET /api/mobile/auth/callback` | — | Mobile sign-in, step 2 |
| `POST /api/mobile/auth/token` | — | Mobile sign-in, step 3: exchange the code and PKCE verifier for a token |
| `POST /api/mobile/auth/logout` | Bearer | End this device's session |

Errors come back as `{ error, fieldErrors? }` with a matching HTTP status: 401 not signed in, 404 not found, 409 sold out or empty cart, 422 invalid checkout details.

**Live updates:** `/api/cart/stream` checks a small summary of the cart about once a second and pushes the full cart when it changes. The website listens too ([CartLiveSync](src/components/CartLiveSync.tsx)), so a change made in the app shows up in an open browser tab without a reload.

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Database (Supabase)

1. Create a project at <https://supabase.com/dashboard>. Save the database password you choose.
2. Click **Connect** in the project's top bar, then open **Connection String** and copy two URIs:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`. The app uses this one.
   - **Session pooler** (port `5432`) → `DIRECT_URL`. Migrations use this one.

   Replace `[YOUR-PASSWORD]` in both with your database password.
3. Create the tables and add the sample products:

   ```bash
   npm run db:setup     # runs db:migrate, then db:seed
   ```

   If you'd rather not run migrations from your machine, paste [drizzle/0000_init.sql](drizzle/0000_init.sql) into the Supabase **SQL Editor** and run it. Then run `npm run db:seed`.

The tables appear in Supabase under **Table Editor**, so you can watch users, carts and orders arrive as you use the site.

**Security:** every table has Row Level Security enabled with no policies. That blocks Supabase's public Data API, which anyone with the project's anon key can call, from reading sessions, OAuth tokens or orders. The app connects to Postgres directly as the table owner, so RLS doesn't affect it. Don't add RLS policies or use the `anon` key unless you mean to expose a table to the browser.

**Changing the schema:** edit [src/db/schema.ts](src/db/schema.ts), then run `npm run db:generate` to write a new migration and `npm run db:migrate` to apply it.

### 3. Google OAuth (Google Cloud Console)

1. Open <https://console.cloud.google.com/> and create or select a project.
2. Go to **APIs & Services → OAuth consent screen**. Configure it as **External** and add yourself as a test user.
3. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**, and choose **Web application**.
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   - When you deploy, add your production origin and `https://YOUR_DOMAIN/api/auth/callback/google`.
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
5. Generate `AUTH_SECRET` with `npx auth secret` or `openssl rand -base64 32`.

### 4. Mailgun

1. In the Mailgun dashboard, use the sandbox domain or add and verify your own domain.
   - On the sandbox domain, add each recipient under **Authorized Recipients** first.
2. Set these variables:
   - `MAILGUN_API_KEY`: a private API key from **API Security**
   - `MAILGUN_DOMAIN`: for example `sandboxXXXX.mailgun.org` or `mg.yourdomain.com`
   - `MAILGUN_FROM`: for example `Common Goods <orders@mg.yourdomain.com>`
   - `MAILGUN_API_BASE`: set to `https://api.eu.mailgun.net` if the domain is in the EU region
3. Set `APP_URL` to the public URL. The email's "View your order" link uses it.

If an email fails to send, the order is still saved. The failure is logged and shown on the order confirmation page.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Deploying (e.g. Vercel)

Add every variable from `.env.local` to the project's environment variables, and set `APP_URL` to the production URL. Then add the production redirect URI to your Google OAuth client.

## Project layout

```
src/
  auth.ts                 Auth.js config (Google + Drizzle adapter)
  db/schema.ts            All tables
  db/index.ts             Postgres client (Supabase pooler, TLS)
  lib/shop.ts             Cart, checkout and order logic shared by the website and the API
  lib/api.ts              API auth (cookie or Bearer token), mobile sign-in helpers
  lib/mailgun.ts          Confirmation email
  lib/cart.ts             Cart queries
  app/actions.ts          Server actions used by the website's pages
  app/api/...             REST API used by the mobile app
  app/...                 Pages
  components/...          UI components
drizzle/                  SQL migrations
scripts/seed.ts           Sample products
mobile/                   Expo (React Native) app
vercel.json               Runs functions in Frankfurt (fra1), next to the Supabase database
```
