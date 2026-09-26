import { SEED_BOXES } from "./catalog-seed";
import {
  LIVE_REVALIDATE_SECONDS,
  PRICES_ENDPOINT,
  STORE_PRODUCTS_ENDPOINT,
} from "./config";
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

/** Subset of the WooCommerce Store API product shape that we read. */
interface StoreProduct {
  id: number;
  on_sale?: boolean;
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
    currency_code?: string;
    currency_minor_unit?: number;
  };
  images?: Array<{ src?: string; thumbnail?: string }>;
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

/** Live data for one product, merged over whatever cache we have. */
interface LiveInfo {
  price: PriceInfo;
  thumb: string | null;
}

const FETCH_TIMEOUT_MS = 6000;

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
  const onSale = onSaleRaw && sale != null && sale > 0 && sale < regular;
  return {
    wooId,
    price: onSale && sale != null ? sale : regular,
    regularPrice: regular,
    salePrice: onSale ? sale : null,
    onSale,
    inStock,
    currency,
  };
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

/** fetch() with a hard timeout and Next's time-based revalidation. */
async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      next: { revalidate: LIVE_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Primary live source: the public Store API, one request for all planner
 * products. Gives current price, sale, stock and product images.
 */
async function fetchStoreLive(wooIds: number[]): Promise<Map<number, LiveInfo>> {
  const map = new Map<number, LiveInfo>();
  if (wooIds.length === 0) return map;
  const url = `${STORE_PRODUCTS_ENDPOINT}?include=${wooIds.join(",")}&per_page=${Math.max(wooIds.length, 20)}`;
  const data = await fetchJson<StoreProduct[]>(url);
  if (!Array.isArray(data)) return map;
  for (const p of data) {
    const wooId = toNum(p.id);
    if (!wooId || !p.prices) continue;
    const unit = Math.pow(10, p.prices.currency_minor_unit ?? 2);
    const regular = toNum(p.prices.regular_price) / unit;
    const sale = toNum(p.prices.sale_price) / unit;
    const current = toNum(p.prices.price) / unit;
    const onSale = Boolean(p.on_sale) && current < regular;
    const inStock = p.is_in_stock !== false && p.is_purchasable !== false;
    const img = p.images?.[0];
    map.set(wooId, {
      price: priceFromParts(
        wooId,
        regular || current,
        onSale ? sale || current : null,
        onSale,
        inStock,
        p.prices.currency_code || "ILS",
      ),
      thumb: img?.thumbnail || img?.src || null,
    });
  }
  return map;
}

/** Secondary live source: the companion snippet's whole-catalog price feed. */
async function fetchSnippetLive(): Promise<Map<number, LiveInfo>> {
  const map = new Map<number, LiveInfo>();
  const data = await fetchJson<WooPriceRow[]>(PRICES_ENDPOINT);
  if (!Array.isArray(data)) return map;
  for (const p of data) {
    const wooId = toNum(p.id);
    if (!wooId) continue;
    const regular = toNum(p.regular_price, toNum(p.price));
    const sale =
      p.sale_price != null && p.sale_price !== "" ? toNum(p.sale_price) : null;
    map.set(wooId, {
      price: priceFromParts(wooId, regular, sale, Boolean(p.on_sale), p.in_stock !== false),
      thumb: null,
    });
  }
  return map;
}

/** Live prices + stock for the given products. Never throws, may be empty. */
async function fetchLive(wooIds: number[]): Promise<Map<number, LiveInfo>> {
  const primary = await fetchStoreLive(wooIds);
  if (primary.size > 0) return primary;
  return fetchSnippetLive();
}

interface BoxSource {
  boxes: BoxType[];
  /** Price cache (Supabase `prices` table, filled by the Woo webhook / sync). */
  cached: Map<number, PriceInfo>;
}

async function boxesFromSupabase(): Promise<BoxSource | null> {
  const sb = serverAnon();
  if (!sb) return null;
  const [boxesRes, pricesRes] = await Promise.all([
    sb.from("boxes").select("*").eq("active", true).order("sort_order"),
    sb.from("prices").select("*"),
  ]);
  if (boxesRes.error || !boxesRes.data || boxesRes.data.length === 0) return null;

  const cached = new Map<number, PriceInfo>();
  for (const p of (pricesRes.data ?? []) as PriceRow[]) {
    cached.set(
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
  return { boxes: (boxesRes.data as BoxRow[]).map(boxRowToType), cached };
}

function boxesFromSeed(): BoxSource {
  const boxes = SEED_BOXES.filter((b) => b.active)
    .map((b): BoxType => {
      const { fallbackPrice: _fp, ...box } = b;
      void _fp;
      return box;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { boxes, cached: new Map() };
}

/**
 * Catalog for the planner: box definitions + live prices/stock.
 *
 * Box definitions come from Supabase when configured & populated, otherwise
 * from the bundled seed. Prices and stock are always pulled live from the
 * store (cached for LIVE_REVALIDATE_SECONDS). If the store is unreachable we
 * fall back to the Supabase price cache, then to the seed fallback prices.
 */
export async function getCatalog(): Promise<CatalogItem[]> {
  const source =
    (await boxesFromSupabase().catch(() => null)) ?? boxesFromSeed();
  const live = await fetchLive(source.boxes.map((b) => b.wooId));

  return source.boxes.map((box): CatalogItem => {
    const l = live.get(box.wooId);
    const price =
      l?.price ??
      source.cached.get(box.wooId) ??
      priceFromParts(box.wooId, seedFallbackByWoo.get(box.wooId) ?? 0, null, false, true);
    return { ...box, price, fallbackImg: l?.thumb ?? null };
  });
}
