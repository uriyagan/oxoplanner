import { ADD_TO_CART_ENDPOINT, CART_PATH, STORE_BASE } from "./config";
import { effectivePrice } from "./format";
import type { CatalogItem, PlacedBox } from "./types";

export interface CartLine {
  wooId: number;
  qty: number;
  name: string;
  price: number;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Aggregate placed boxes into per-product cart lines. */
export function buildCartLines(
  placed: PlacedBox[],
  catalog: CatalogItem[],
): CartLine[] {
  const counts = new Map<string, number>();
  for (const p of placed) counts.set(p.typeId, (counts.get(p.typeId) ?? 0) + 1);
  const lines: CartLine[] = [];
  for (const [id, qty] of counts) {
    const item = catalog.find((c) => c.id === id);
    if (!item || !item.wooId) continue;
    lines.push({
      wooId: item.wooId,
      qty,
      name: item.name,
      price: effectivePrice(item.price, 0),
    });
  }
  return lines;
}

export function pushAddToCartEvent(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  const value = lines.reduce((s, l) => s + l.price * l.qty, 0);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "add_to_cart",
    ecommerce: {
      currency: "ILS",
      value,
      items: lines.map((l) => ({
        item_id: l.wooId,
        item_name: l.name,
        price: l.price,
        quantity: l.qty,
      })),
    },
  });
}

/**
 * Send the selection to the WooCommerce cart.
 * Preferred: a single top-level redirect to a companion endpoint that adds all
 * items and 302s to the cart (carries the Woo session cookie reliably).
 * Fallback: sequential add-to-cart requests, then redirect to the cart.
 */
export async function checkout(lines: CartLine[]): Promise<void> {
  if (lines.length === 0) return;
  pushAddToCartEvent(lines);

  if (ADD_TO_CART_ENDPOINT) {
    const items = lines.map((l) => `${l.wooId}:${l.qty}`).join(",");
    const sep = ADD_TO_CART_ENDPOINT.includes("?") ? "&" : "?";
    window.location.href = `${ADD_TO_CART_ENDPOINT}${sep}oxo_cart=${encodeURIComponent(items)}`;
    return;
  }

  // Fallback: best-effort sequential adds (same-session), then go to cart.
  for (const l of lines) {
    try {
      await fetch(`${STORE_BASE}/?add-to-cart=${l.wooId}&quantity=${l.qty}`, {
        method: "GET",
        credentials: "include",
        mode: "no-cors",
      });
    } catch {
      // ignore and continue
    }
  }
  window.location.href = `${STORE_BASE}${CART_PATH}`;
}
