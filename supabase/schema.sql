-- OXO POP Planner — Supabase schema
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ── Catalog: box definitions managed in the admin ──────────────────
create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  woo_id integer not null,
  name text not null,
  category text not null default 'מיני',
  width_mm integer not null check (width_mm > 0),
  height_mm integer not null check (height_mm > 0),
  depth_mm integer not null check (depth_mm > 0),
  front_img_url text not null default '',
  top_img_url text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Prices: cache pushed in from the WooCommerce webhook ───────────
create table if not exists public.prices (
  woo_id integer primary key,
  regular_price numeric not null default 0,
  sale_price numeric,
  on_sale boolean not null default false,
  in_stock boolean not null default true,
  currency text not null default 'ILS',
  updated_at timestamptz not null default now()
);

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.boxes enable row level security;
alter table public.prices enable row level security;

drop policy if exists "public read boxes" on public.boxes;
create policy "public read boxes" on public.boxes for select using (true);

drop policy if exists "auth write boxes" on public.boxes;
create policy "auth write boxes" on public.boxes
  for all to authenticated using (true) with check (true);

drop policy if exists "public read prices" on public.prices;
create policy "public read prices" on public.prices for select using (true);
-- prices are written only by the webhook using the service-role key (bypasses RLS).

-- ── Storage bucket for uploaded box images ─────────────────────────
-- NOTE: Supabase blocks creating buckets/policies from the SQL editor
-- (ERROR 42501 permission denied for table buckets). Do this in the UI:
--   1. Storage → New bucket → name "box-images" → Public bucket ON → Save.
--   2. The bucket being public gives public read. For admin uploads, add a
--      policy: Storage → Policies → box-images → New policy →
--      "For full customization" → allow INSERT/UPDATE/DELETE for role
--      "authenticated" (template "Give users access to authenticated uploads"),
--      or simply allow all operations to authenticated on bucket_id = 'box-images'.
