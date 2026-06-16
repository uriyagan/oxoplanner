# OXO POP Planner

A standalone planner that lets customers define a shelf or drawer size and drag
true-to-scale OXO POP boxes into it (refined 2D, front + top views), then send
the selection to the WooCommerce cart on uniqook.co.il.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase
- **Catalog:** managed in `/admin`; live prices pushed from WooCommerce
- **Packing:** real seeded 2D skyline packer + truthful utilization (`lib/packing.ts`)

Works out-of-the-box without a backend: with no env vars it serves the 16 bundled
boxes and pulls live prices from `…/wp-json/oxo/v1/prices`. Configure Supabase to
unlock the self-service admin + webhook-driven prices.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000  ·  admin at /admin
```

## Setup for production

### 1. Supabase (catalog + prices + admin login + image storage)
1. Create a free project at supabase.com.
2. SQL Editor → paste & run `supabase/schema.sql` (creates tables, RLS, the
   `box-images` storage bucket).
3. Authentication → Users → add one user (your admin email + password).
4. Project Settings → API → copy the values into env vars (below):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (keep the service role secret — server only).
5. Open `/admin`, log in, click **ייבוא ברירת מחדל** to import the 16 boxes,
   then **סנכרון מחירים מהחנות** to load current prices.

### 2. WordPress / WooCommerce
Add `wordpress-snippet.php` to your site (child theme `functions.php`, a small
plugin, or Code Snippets). It provides the price feed and the bulk add-to-cart
redirect used at checkout.

Then in **WooCommerce → Settings → Advanced → Webhooks**, create a webhook:
- Topic: **Product updated**
- Delivery URL: `https://YOUR-APP.vercel.app/api/woo-webhook`
- Secret: a strong random string → also set as `WOO_WEBHOOK_SECRET` env var

Now any price/sale change in WooCommerce is pushed to the planner instantly.

### 3. Environment variables
Copy `.env.example` → `.env.local` (local) and set the same vars in Vercel.

### 4. Deploy (Vercel)
Push this folder to a Git repo, import it in Vercel, add the env vars, deploy.
Embed the resulting URL on your site (link or iframe).

## Key files
- `lib/packing.ts` — packing engine, collision/support, utilization (pure, testable)
- `lib/usePlanner.ts` — planner state (placement, history, persistence, auto-fill)
- `components/planner/*` — planner UI (Canvas, Catalog, Controls, OrderSummary…)
- `components/admin/*` — catalog manager
- `app/api/woo-webhook/route.ts` — HMAC-verified price upserts
- `app/api/sync-prices/route.ts` — admin-triggered bulk price sync
- `lib/catalog-seed.ts` — the 16 boxes (bundled fallback + admin import source)
