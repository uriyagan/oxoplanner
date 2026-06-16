import { SEED_BOXES, type SeedBox } from "./catalog-seed";
import { PRICES_ENDPOINT } from "./config";
import { serverAnon } from "./supabase/server";
import type { BoxType, CatalogItem, PriceInfo } from "./types";

interface WooPriceRow {
  id: number | string;
  price?: number | string;
  regular_price?: number | string;
  sale_price?: number | string | null;
  on_sale?: boolean;
  in_stock?: boolean;
}

interface BoxRow {
  id: string;
  woo_id: number;
  name: string;
  category: string;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
  front_img_url: string;
  top_img_url: string;
  sort_order: number;
  active: boolean;
}

interface PriceRow {
  woo_id: number;
  regular_price: number;
  sale_price: number | null;
  on_sale: boolean;
  in_stock: boolean;
  currency: string;
}

function toNum(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function priceFromParts(
  wooId: number,
  regular: number,
  sale: number | null,
  onSaleRaw: boolean,
  inStock: boolean,
  currency = "ILS",
): PriceInfo {
  const onSale = onSaleRaw && sale != null && sale > 0;
  return {
    wooId,
    price: onSale && sale != null ? sale : regular,
    regularPrice: regular,
    salePrice: sale,
    onSale,
    inStock,
    currency,
  };
}

function seedPrice(b: SeedBox): PriceInfo {
  return priceFromParts(b.wooId, b.fallbackPrice, null, false, true);
}

const seedFallbackByWoo = new Map(SEED_BOXES.map((b) => [b.wooId, b.fallbackPrice]));

function boxRowToType(r: BoxRow): BoxType {
  return {
    id: r.id,
    wooId: r.woo_id,
    name: r.name,
    category: r.category,
    w: r.width_mm,
    h: r.height_mm,
    d: r.depth_mm,
    frontImg: r.front_img_url,
    topImg: r.top_img_url,
    sortOrder: r.sort_order,
    active: r.active,
  };
}

/** Pull live prices from the WooCommerce endpoint; tolerant of errors/timeouts. */
async function fetchWooPrices(): Promise<Map<number, PriceInfo>> {
  const map = new Map<number, PriceInfo>();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(PRICES_ENDPOINT, {
      signal: ctrl.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (!res.ok) return map;
    const data = (await res.json()) as WooPriceRow[];
    if (!Array.isArray(data)) return map;
    for (const p of data) {
      const wooId = toNum(p.id);
      if (!wooId) continue;
      const regular = toNum(p.regular_price, toNum(p.price));
      const sale =
        p.sale_price != null && p.sale_price !== "" ? toNum(p.sale_price) : null;
      map.set(
        wooId,
        priceFromParts(wooId, regular, sale, Boolean(p.on_sale), p.in_stock !== false),
      );
    }
  } catch {
    // ignore — fall back to seed prices
  }
  return map;
}

async function getFromSupabase(): Promise<CatalogItem[] | null> {
  const sb = serverAnon();
  if (!sb) return null;
  const [boxesRes, pricesRes] = await Promise.all([
    sb.from("boxes").select("*").eq("active", true).order("sort_order"),
    sb.from("prices").select("*"),
  ]);
  if (boxesRes.error || !boxesRes.data || boxesRes.data.length === 0) return null;

  const priceMap = new Map<number, PriceInfo>();
  for (const p of (pricesRes.data ?? []) as PriceRow[]) {
    priceMap.set(
      p.woo_id,
      priceFromParts(
        p.woo_id,
        toNum(p.regular_price),
        p.sale_price != null ? toNum(p.sale_price) : null,
        p.on_sale,
        p.in_stock,
        p.currency || "ILS",
      ),
    );
  }

  return (boxesRes.data as BoxRow[]).map((row): CatalogItem => {
    const box = boxRowToType(row);
    const price =
      priceMap.get(box.wooId) ??
      priceFromParts(
        box.wooId,
        seedFallbackByWoo.get(box.wooId) ?? 0,
        null,
        false,
        true,
      );
    return { ...box, price };
  });
}

async function getFromSeed(): Promise<CatalogItem[]> {
  const live = await fetchWooPrices();
  return SEED_BOXES.filter((b) => b.active)
    .map((b): CatalogItem => {
      const price = live.get(b.wooId) ?? seedPrice(b);
      const { fallbackPrice: _fp, ...box } = b;
      void _fp;
      return { ...box, price };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Catalog for the planner: box definitions + live prices.
 * Source: Supabase when configured & populated; otherwise the bundled seed
 * with live prices pulled from the WooCommerce endpoint.
 */
export async function getCatalog(): Promise<CatalogItem[]> {
  const fromDb = await getFromSupabase().catch(() => null);
  if (fromDb && fromDb.length) return fromDb;
  return getFromSeed();
}
