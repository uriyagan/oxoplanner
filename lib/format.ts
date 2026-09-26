import type { PriceInfo } from "./types";

/** Format an ILS amount the way the storefront does: "₪79" / whole shekels. */
export function formatPrice(amount: number, currency = "ILS"): string {
  const symbol = currency === "ILS" ? "₪" : currency + " ";
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
  return `${symbol}${rounded.toLocaleString("he-IL")}`;
}

export function effectivePrice(p: PriceInfo | null, fallback: number): number {
  if (!p) return fallback;
  return p.onSale && p.salePrice != null ? p.salePrice : p.price;
}

/** Unknown stock (no live data) is treated as available. */
export function isInStock(p: PriceInfo | null): boolean {
  return p ? p.inStock !== false : true;
}
