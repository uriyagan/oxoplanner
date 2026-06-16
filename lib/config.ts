/** Storefront + integration configuration (overridable via env). */

export const STORE_BASE =
  process.env.NEXT_PUBLIC_STORE_BASE?.replace(/\/$/, "") || "https://uniqook.co.il";

export const CART_PATH = process.env.NEXT_PUBLIC_CART_PATH || "/cart/";

/** Existing WooCommerce prices endpoint used as a live-price fallback. */
export const PRICES_ENDPOINT = `${STORE_BASE}/wp-json/oxo/v1/prices`;

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
