"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { IMAGE_BUCKET } from "@/lib/supabase/env";
import { CATEGORY_ORDER, SEED_BOXES } from "@/lib/catalog-seed";

export interface AdminBox {
  id?: string;
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

const EMPTY: AdminBox = {
  woo_id: 0,
  name: "",
  category: CATEGORY_ORDER[0],
  width_mm: 100,
  height_mm: 100,
  depth_mm: 100,
  front_img_url: "",
  top_img_url: "",
  sort_order: 0,
  active: true,
};

export default function BoxManager({
  session,
  onSignOut,
}: {
  session: Session;
  onSignOut: () => void;
}) {
  const sb = getBrowserSupabase();
  const [boxes, setBoxes] = useState<AdminBox[]>([]);
  const [editing, setEditing] = useState<AdminBox | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb.from("boxes").select("*").order("sort_order");
    if (!error && data) setBoxes(data as AdminBox[]);
    setLoading(false);
  }, [sb]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  const save = async (box: AdminBox) => {
    const row = { ...box };
    if (!row.id) delete row.id;
    const { error } = await sb.from("boxes").upsert(row);
    if (error) return flash("שגיאה בשמירה: " + error.message);
    setEditing(null);
    flash("נשמר");
    load();
  };

  const remove = async (id?: string) => {
    if (!id || !confirm("למחוק קופסה זו?")) return;
    const { error } = await sb.from("boxes").delete().eq("id", id);
    if (error) return flash("שגיאה במחיקה");
    flash("נמחק");
    load();
  };

  const toggleActive = async (b: AdminBox) => {
    await sb.from("boxes").update({ active: !b.active }).eq("id", b.id);
    load();
  };

  const move = async (b: AdminBox, dir: -1 | 1) => {
    const idx = boxes.findIndex((x) => x.id === b.id);
    const swap = boxes[idx + dir];
    if (!swap) return;
    await Promise.all([
      sb.from("boxes").update({ sort_order: swap.sort_order }).eq("id", b.id),
      sb.from("boxes").update({ sort_order: b.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const importDefaults = async () => {
    if (boxes.length > 0 && !confirm("להוסיף את 16 קופסאות ברירת המחדל?")) return;
    const rows = SEED_BOXES.map((b) => ({
      woo_id: b.wooId,
      name: b.name,
      category: b.category,
      width_mm: b.w,
      height_mm: b.h,
      depth_mm: b.d,
      front_img_url: b.frontImg,
      top_img_url: b.topImg,
      sort_order: b.sortOrder,
      active: true,
    }));
    const { error } = await sb.from("boxes").insert(rows);
    if (error) return flash("שגיאה בייבוא: " + error.message);
    flash("יובאו 16 קופסאות");
    load();
  };

  const syncPrices = async () => {
    flash("מסנכרן מחירים…");
    const res = await fetch("/api/sync-prices", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    flash(res.ok ? `סונכרנו ${json.synced} מחירים` : "שגיאה בסנכרון מחירים");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditing({ ...EMPTY, sort_order: boxes.length + 1 })}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + קופסה חדשה
          </button>
          <button
            onClick={importDefaults}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm hover:bg-bg"
          >
            ייבוא ברירת מחדל
          </button>
          <button
            onClick={syncPrices}
            className="rounded-md border border-line bg-white px-4 py-2 text-sm hover:bg-bg"
          >
            סנכרון מחירים מהחנות
          </button>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{session.user.email}</span>
          <button onClick={onSignOut} className="text-brand hover:underline">
            התנתקות
          </button>
        </div>
      </div>

      {status && (
        <div className="rounded-md bg-ink px-4 py-2 text-sm text-white">{status}</div>
      )}

      {loading ? (
        <div className="py-10 text-center text-muted">טוען…</div>
      ) : boxes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-muted">
          אין קופסאות עדיין. לחצו &quot;ייבוא ברירת מחדל&quot; כדי להתחיל מ-16 הקופסאות הקיימות.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-line bg-bg text-xs text-muted">
              <tr>
                <th className="p-2.5">תמונה</th>
                <th className="p-2.5">שם</th>
                <th className="p-2.5">קטגוריה</th>
                <th className="p-2.5">מידות (ס&quot;מ)</th>
                <th className="p-2.5">Woo ID</th>
                <th className="p-2.5">פעיל</th>
                <th className="p-2.5">סדר</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((b) => (
                <tr key={b.id} className="border-b border-bg last:border-0">
                  <td className="p-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.front_img_url}
                      alt=""
                      className="h-9 w-9 object-contain"
                    />
                  </td>
                  <td className="p-2.5 font-medium">{b.name}</td>
                  <td className="p-2.5 text-muted">{b.category}</td>
                  <td className="p-2.5 text-muted">
                    {b.width_mm / 10}×{b.height_mm / 10}×{b.depth_mm / 10}
                  </td>
                  <td className="p-2.5 text-muted">{b.woo_id}</td>
                  <td className="p-2.5">
                    <button
                      onClick={() => toggleActive(b)}
                      className={b.active ? "text-green-600" : "text-neutral-400"}
                    >
                      {b.active ? "✓" : "✕"}
                    </button>
                  </td>
                  <td className="p-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => move(b, -1)} className="hover:text-brand">
                        ▲
                      </button>
                      <button onClick={() => move(b, 1)} className="hover:text-brand">
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(b)}
                        className="text-brand hover:underline"
                      >
                        עריכה
                      </button>
                      <button
                        onClick={() => remove(b.id)}
                        className="text-neutral-400 hover:text-brand"
                      >
                        מחיקה
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <BoxEditor
          box={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onUpload={async (file, kind) => {
            const path = `${Date.now()}-${kind}-${file.name.replace(/[^\w.\-]/g, "_")}`;
            const { error } = await sb.storage
              .from(IMAGE_BUCKET)
              .upload(path, file, { upsert: true });
            if (error) throw error;
            return sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
          }}
        />
      )}
    </div>
  );
}

function BoxEditor({
  box,
  onClose,
  onSave,
  onUpload,
}: {
  box: AdminBox;
  onClose: () => void;
  onSave: (b: AdminBox) => void;
  onUpload: (file: File, kind: "front" | "top") => Promise<string>;
}) {
  const [form, setForm] = useState<AdminBox>(box);
  const [uploading, setUploading] = useState<"front" | "top" | null>(null);

  const set = (patch: Partial<AdminBox>) => setForm((f) => ({ ...f, ...patch }));
  const cm = (mm: number) => Math.round(mm / 10);

  const upload = async (file: File, kind: "front" | "top") => {
    setUploading(kind);
    try {
      const url = await onUpload(file, kind);
      set(kind === "front" ? { front_img_url: url } : { top_img_url: url });
    } catch {
      alert("העלאת התמונה נכשלה");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-lg rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {box.id ? "עריכת קופסה" : "קופסה חדשה"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="שם">
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="קטגוריה">
              <input
                list="cats"
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
                className="input"
              />
              <datalist id="cats">
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="WooCommerce ID">
              <input
                type="number"
                value={form.woo_id || ""}
                onChange={(e) => set({ woo_id: parseInt(e.target.value, 10) || 0 })}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["width", "height", "depth"] as const).map((dim) => {
              const key = `${dim}_mm` as "width_mm" | "height_mm" | "depth_mm";
              const label = { width: "רוחב", height: "גובה", depth: "עומק" }[dim];
              return (
                <Field key={dim} label={`${label} (ס"מ)`}>
                  <input
                    type="number"
                    value={cm(form[key])}
                    onChange={(e) =>
                      set({ [key]: (parseInt(e.target.value, 10) || 0) * 10 } as Partial<AdminBox>)
                    }
                    className="input"
                  />
                </Field>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ImageField
              label="תמונת חזית"
              url={form.front_img_url}
              busy={uploading === "front"}
              onPick={(f) => upload(f, "front")}
              onUrl={(u) => set({ front_img_url: u })}
            />
            <ImageField
              label="תמונת מבט-על"
              url={form.top_img_url}
              busy={uploading === "top"}
              onPick={(f) => upload(f, "top")}
              onUrl={(u) => set({ top_img_url: u })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set({ active: e.target.checked })}
              className="accent-brand"
            />
            פעיל (מוצג ללקוחות)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm hover:bg-bg"
          >
            ביטול
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.name || !form.woo_id}
            className="rounded-md bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            שמירה
          </button>
        </div>
      </div>

      <style>{`.input{width:100%;border:1px solid var(--color-line);border-radius:6px;padding:8px 10px;outline:none;font-size:0.875rem}.input:focus{border-color:var(--color-brand)}`}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

function ImageField({
  label,
  url,
  busy,
  onPick,
  onUrl,
}: {
  label: string;
  url: string;
  busy: boolean;
  onPick: (file: File) => void;
  onUrl: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-line p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? (
          <img src={url} alt="" className="h-10 w-10 object-contain" />
        ) : (
          <div className="h-10 w-10 rounded bg-bg" />
        )}
        <label className="cursor-pointer rounded bg-bg px-2 py-1 text-xs hover:bg-line">
          {busy ? "מעלה…" : "העלאה"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
          />
        </label>
      </div>
      <input
        value={url}
        onChange={(e) => onUrl(e.target.value)}
        placeholder="או הדביקו כתובת תמונה"
        className="rounded-md border border-line px-2 py-1 text-xs outline-none focus:border-brand"
      />
    </div>
  );
}
