# Common Goods: a small shop

A full-stack shop built with Next.js (App Router).

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
drizzle/                  SQL migrations
  lib/mailgun.ts          Confirmation email
  lib/cart.ts             Cart queries
  app/actions.ts          Server actions: cart, checkout, sign in/out
  app/...                 Pages
  components/...          UI components
scripts/seed.ts           Sample products
```
