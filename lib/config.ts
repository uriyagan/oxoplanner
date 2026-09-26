/** Storefront + integration configuration (overridable via env). */

export const STORE_BASE =
  process.env.NEXT_PUBLIC_STORE_BASE?.replace(/\/$/, "") || "https://www.uniqook.co.il";

export const CART_PATH = process.env.NEXT_PUBLIC_CART_PATH || "/cart/";

/**
 * Primary live source: the public WooCommerce Store API. One request returns
 * price, sale, stock and product images for all planner products.
 */
export const STORE_PRODUCTS_ENDPOINT = `${STORE_BASE}/wp-json/wc/store/v1/products`;

/** Secondary live source (companion snippet): prices for the whole catalog. */
export const PRICES_ENDPOINT = `${STORE_BASE}/wp-json/oxo/v1/prices`;

/** How long (seconds) live prices/stock may be served from cache. */
export const LIVE_REVALIDATE_SECONDS = 300;

/**
 * Optional companion endpoint that adds many items at once and 302s to the cart.
 * If unset, the app falls back to sequential ?add-to-cart= redirects.
 */
export const ADD_TO_CART_ENDPOINT =
  process.env.NEXT_PUBLIC_ADD_TO_CART_ENDPOINT || "";

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-TV96297";

/** Container size limits (cm). */
export const DIM_LIMITS = { min: 10, max: 200 } as const;
export const DEFAULT_DIMS = { width: 50, height: 40, depth: 30 } as const;
