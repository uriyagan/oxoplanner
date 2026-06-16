// One-off setup helper: import the 16 default boxes into Supabase and sync
// prices from WooCommerce. Run with the service-role key in the environment:
//   set -a; . ./.env.local; set +a; node scripts/seed-supabase.ts
import { createClient } from "@supabase/supabase-js";
import { SEED_BOXES } from "../lib/catalog-seed.ts";
import { PRICES_ENDPOINT } from "../lib/config.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: selErr } = await sb.from("boxes").select("id");
if (selErr) {
  console.error("Cannot read boxes table — did you run schema.sql?", selErr.message);
  process.exit(2);
}
console.log("Existing boxes:", existing.length);

if (existing.length === 0) {
  const rows = SEED_BOXES.map((b) => ({
    woo_id: b.wooId,
    name: b.name,
    category: b.category,
    width_mm: b.w,
    height_mm: b.h,
    depth_mm: b.d,
    front_img_url: b.frontImg,
    top_img_url: b.topImg,
    sort_order: b.sortOrder,
    active: true,
  }));
  const { error } = await sb.from("boxes").insert(rows);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(3);
  }
  console.log("Inserted", rows.length, "boxes.");
} else {
  console.log("Boxes already present — skipping import.");
}

try {
  const res = await fetch(PRICES_ENDPOINT);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  const ups = data
    .map((p) => {
      const wooId = Number(p.id);
      const sale =
        p.sale_price != null && p.sale_price !== "" ? Number(p.sale_price) : null;
      return {
        woo_id: wooId,
        regular_price: Number(p.regular_price ?? p.price ?? 0),
        sale_price: sale,
        on_sale: Boolean(p.on_sale) && sale != null,
        in_stock: p.in_stock !== false,
        currency: "ILS",
        updated_at: new Date().toISOString(),
      };
    })
    .filter((r) => r.woo_id);
  const { error } = await sb.from("prices").upsert(ups, { onConflict: "woo_id" });
  console.log(error ? "Price sync error: " + error.message : `Synced ${ups.length} prices.`);
} catch (e) {
  console.log("Price sync skipped:", (e as Error).message);
}

console.log("Done.");
