import { createClient } from "@supabase/supabase-js";
import { PRICES_ENDPOINT } from "@/lib/config";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { serverService } from "@/lib/supabase/server";

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/** Verify the caller is a signed-in admin via their Supabase access token. */
async function isAuthorized(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser();
  return !error && Boolean(data.user);
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = serverService();
  if (!sb) return Response.json({ error: "supabase not configured" }, { status: 500 });

  let rows: Array<Record<string, unknown>>;
  try {
    const res = await fetch(PRICES_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`prices endpoint ${res.status}`);
    rows = await res.json();
  } catch (e) {
    return Response.json(
      { error: `failed to fetch prices: ${(e as Error).message}` },
      { status: 502 },
    );
  }
  if (!Array.isArray(rows)) {
    return Response.json({ error: "unexpected prices payload" }, { status: 502 });
  }

  const upserts = rows
    .map((p) => {
      const wooId = toNum(p.id);
      if (!wooId) return null;
      const regular = toNum(p.regular_price ?? p.price);
      const sale =
        p.sale_price != null && p.sale_price !== "" ? toNum(p.sale_price) : null;
      return {
        woo_id: wooId,
        regular_price: regular,
        sale_price: sale,
        on_sale: Boolean(p.on_sale) && sale != null && sale > 0,
        in_stock: p.in_stock !== false,
        currency: "ILS",
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  if (upserts.length === 0) return Response.json({ ok: true, synced: 0 });

  const { error } = await sb.from("prices").upsert(upserts, { onConflict: "woo_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, synced: upserts.length });
}
