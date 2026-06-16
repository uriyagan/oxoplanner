import crypto from "node:crypto";
import { serverService } from "@/lib/supabase/server";

const SECRET = process.env.WOO_WEBHOOK_SECRET || "";

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/** WooCommerce signs the raw body: base64( HMAC-SHA256(body, secret) ). */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!SECRET || !signature) return false;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-wc-webhook-signature");

  // WooCommerce sends a plain-text ping ("webhook_id=...") when the hook is created.
  if (!raw.trim().startsWith("{")) {
    return Response.json({ ok: true, ping: true });
  }

  if (!verifySignature(raw, signature)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const sb = serverService();
  if (!sb) {
    return Response.json({ error: "supabase not configured" }, { status: 500 });
  }

  let product: Record<string, unknown>;
  try {
    product = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }

  const wooId = toNum(product.id);
  if (!wooId) return Response.json({ error: "no product id" }, { status: 400 });

  const regular = toNum(product.regular_price ?? product.price);
  const saleRaw = product.sale_price;
  const sale =
    saleRaw != null && saleRaw !== "" ? toNum(saleRaw) : null;
  const onSale = Boolean(product.on_sale) && sale != null && sale > 0;
  const inStock = product.stock_status
    ? product.stock_status === "instock"
    : true;

  const { error } = await sb.from("prices").upsert(
    {
      woo_id: wooId,
      regular_price: regular,
      sale_price: sale,
      on_sale: onSale,
      in_stock: inStock,
      currency: "ILS",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "woo_id" },
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, woo_id: wooId });
}

export async function GET() {
  return Response.json({
    ok: true,
    info: "OXO price webhook. WooCommerce should POST product updates here.",
  });
}
