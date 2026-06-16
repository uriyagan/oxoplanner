// All physical dimensions are in millimetres (mm).
// Coordinate origin is the bottom-front-left corner of the container:
//   x → along width   (left → right)
//   y → vertical       (floor → up)
//   z → depth          (front → back)

export type Mode = "shelf" | "drawer";
export type ViewType = "front" | "top";
export type SizeClass = "small" | "medium" | "large";

export interface BoxType {
  /** Stable id — uuid from Supabase, or slug from the bundled seed. */
  id: string;
  /** WooCommerce product id, used for pricing + add-to-cart. */
  wooId: number;
  name: string;
  /** Display group, e.g. "ריבוע גדול" / "מלבן" / "מיני". */
  category: string;
  w: number;
  h: number;
  d: number;
  frontImg: string;
  topImg: string;
  sortOrder: number;
  active: boolean;
}

export interface PriceInfo {
  wooId: number;
  /** Effective price the customer pays (sale price if on sale). */
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  inStock: boolean;
  currency: string;
}

/** A box type with its live price merged in (price may be null until loaded). */
export interface CatalogItem extends BoxType {
  price: PriceInfo | null;
}

export interface PlacedBox {
  /** Instance id, unique within a session. */
  id: number;
  /** References BoxType.id. */
  typeId: string;
  x: number;
  y: number;
  z: number;
}

export interface Container {
  w: number;
  h: number;
  d: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
