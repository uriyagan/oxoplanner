import type { BoxType } from "./types";

/**
 * The 16 OXO POP boxes, ported verbatim from the original index.html.
 * Used as the bundled fallback catalog when Supabase isn't configured / reachable,
 * and as the seed for the Supabase `boxes` table.
 *
 * `fallbackPrice` is only used when no live WooCommerce price is available.
 */
export interface SeedBox extends BoxType {
  fallbackPrice: number;
}

const IMG = "https://uniqook.co.il/wp-content/uploads/2026/02/";

export const SEED_BOXES: SeedBox[] = [
  { id: "pop-6210", wooId: 6210, name: "מלבן קצר 1.6 ליטר", category: "מלבן", w: 108, h: 159, d: 165, fallbackPrice: 79, frontImg: IMG + "מלבן-קצר-1.6.png", topImg: IMG + "מכסה-מלבן.svg", sortOrder: 1, active: true },
  { id: "pop-6185", wooId: 6185, name: "מיני מיני 0.2 ליטר", category: "מיני", w: 83, h: 79, d: 83, fallbackPrice: 39, frontImg: IMG + "מיני-0.2.png", topImg: IMG + "מכסה-ריבוע-מיני.svg", sortOrder: 2, active: true },
  { id: "pop-6142", wooId: 6142, name: "ריבוע קטן קצר 1 ליטר", category: "ריבוע קטן", w: 108, h: 159, d: 108, fallbackPrice: 69, frontImg: IMG + "ריבוע-קטן-קצר-1-ליטר.png", topImg: IMG + "מכסה-ריבוע-קטן.svg", sortOrder: 3, active: true },
  { id: "pop-6150", wooId: 6150, name: "ריבוע קטן מיני 0.4 ליטר", category: "ריבוע קטן", w: 108, h: 79, d: 108, fallbackPrice: 59, frontImg: IMG + "מיני-0.4.png", topImg: IMG + "מכסה-ריבוע-קטן.svg", sortOrder: 4, active: true },
  { id: "pop-6234", wooId: 6234, name: "מלבן צר קצר 1.1 ליטר", category: "מלבן צר", w: 83, h: 159, d: 159, fallbackPrice: 79, frontImg: IMG + "מלבן-צר-קצר-1.1.png", topImg: IMG + "מכסה-מלבן-צר.svg", sortOrder: 5, active: true },
  { id: "pop-6218", wooId: 6218, name: "מלבן מיני 0.6 ליטר", category: "מלבן", w: 108, h: 79, d: 165, fallbackPrice: 69, frontImg: IMG + "מיני-0.6.png", topImg: IMG + "מכסה-מלבן.svg", sortOrder: 6, active: true },
  { id: "pop-6089", wooId: 6089, name: "ריבוע גדול קצר 2.6 ליטר", category: "ריבוע גדול", w: 165, h: 159, d: 165, fallbackPrice: 99, frontImg: IMG + "ריבוע-גדול-2.6.png", topImg: IMG + "מכסה-ריבוע-גדול.svg", sortOrder: 7, active: true },
  { id: "pop-6202", wooId: 6202, name: "מלבן בינוני 2.6 ליטר", category: "מלבן", w: 108, h: 241, d: 165, fallbackPrice: 99, frontImg: IMG + "מלבן-בינוני-2.6-ליטר.png", topImg: IMG + "מכסה-מלבן.svg", sortOrder: 8, active: true },
  { id: "pop-6177", wooId: 6177, name: "מיני קצר 0.5 ליטר", category: "מיני", w: 83, h: 159, d: 83, fallbackPrice: 49, frontImg: IMG + "ריבוע-מיני-קצר-0.5-ליטר.png", topImg: IMG + "מכסה-ריבוע-מיני.svg", sortOrder: 9, active: true },
  { id: "pop-6080", wooId: 6080, name: "ריבוע גדול בינוני 4.2 ליטר", category: "ריבוע גדול", w: 165, h: 241, d: 165, fallbackPrice: 129, frontImg: IMG + "קופסת-אחסון-POP-רבוע-גדול-בינוני-4.2-ל.png", topImg: IMG + "מכסה-ריבוע-גדול.svg", sortOrder: 10, active: true },
  { id: "pop-6120", wooId: 6120, name: "ריבוע קטן גבוה 2.1 ליטר", category: "ריבוע קטן", w: 108, h: 320, d: 108, fallbackPrice: 99, frontImg: IMG + "קופסת-אחסון-POP-רבוע-קטן-גבוה-2.1-ליטר.png", topImg: IMG + "מכסה-ריבוע-קטן.svg", sortOrder: 11, active: true },
  { id: "pop-6112", wooId: 6112, name: "ריבוע גדול מיני 1 ליטר", category: "ריבוע גדול", w: 165, h: 79, d: 165, fallbackPrice: 79, frontImg: IMG + "קופסת-אחסון-POP-רבוע-גדול-מיני-1.0-ליטר-.png", topImg: IMG + "מכסה-ריבוע-גדול.svg", sortOrder: 12, active: true },
  { id: "pop-6226", wooId: 6226, name: "מלבן צר בינוני 1.8 ליטר", category: "מלבן צר", w: 83, h: 241, d: 159, fallbackPrice: 89, frontImg: IMG + "מלבן-בינוני-2.6-ליטר.png", topImg: IMG + "מכסה-מלבן-צר.svg", sortOrder: 13, active: true },
  { id: "pop-6130", wooId: 6130, name: "ריבוע קטן בינוני 1.6 ליטר", category: "ריבוע קטן", w: 108, h: 241, d: 108, fallbackPrice: 89, frontImg: IMG + "קופסת-אחסון-POP-רבוע-קטן-בינוני-1.6-ליטר.png", topImg: IMG + "מכסה-ריבוע-קטן.svg", sortOrder: 14, active: true },
  { id: "pop-6194", wooId: 6194, name: "מלבן גבוה 3.5 ליטר", category: "מלבן", w: 108, h: 320, d: 165, fallbackPrice: 119, frontImg: IMG + "קופסת-אחסון-POP-מלבן-גבוה-3.5-ליטר.png", topImg: IMG + "מכסה-מלבן.svg", sortOrder: 15, active: true },
  { id: "pop-6074", wooId: 6074, name: "ריבוע גדול גבוה 5.7 ליטר", category: "ריבוע גדול", w: 165, h: 320, d: 165, fallbackPrice: 149, frontImg: IMG + "קופסת-אחסון-POP-רבוע-גדול-גבוה-5.7-ל.png", topImg: IMG + "מכסה-ריבוע-גדול.svg", sortOrder: 16, active: true },
];

/** Display order of catalog groups. */
export const CATEGORY_ORDER = ["ריבוע גדול", "ריבוע קטן", "מלבן", "מלבן צר", "מיני"];
