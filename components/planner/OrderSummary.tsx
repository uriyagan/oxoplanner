"use client";

import { useMemo } from "react";
import { effectivePrice, formatPrice } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";
import type { PlannerApi } from "@/lib/usePlanner";

export default function OrderSummary({
  api,
  onCheckout,
  busy,
}: {
  api: PlannerApi;
  onCheckout: () => void;
  busy: boolean;
}) {
  const { placed, catalog, addBox, removeOneOfType, clearAll } = api;

  const lines = useMemo(() => {
    const byType = new Map<string, number>();
    for (const p of placed) byType.set(p.typeId, (byType.get(p.typeId) ?? 0) + 1);
    const items: Array<{ item: CatalogItem; count: number; unit: number }> = [];
    let total = 0;
    for (const [id, count] of byType) {
      const item = catalog.find((c) => c.id === id);
      if (!item) continue;
      const unit = effectivePrice(item.price, 0);
      total += unit * count;
      items.push({ item, count, unit });
    }
    items.sort((a, b) => a.item.sortOrder - b.item.sortOrder);
    return { items, total };
  }, [placed, catalog]);

  const empty = lines.items.length === 0;

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <h2 className="mb-4 text-center text-lg font-semibold">סיכום הזמנה</h2>

      <div className="min-h-[60px]">
        {empty ? (
          <div className="py-6 text-center text-[0.95rem] text-muted">
            עדיין לא נבחרו קופסאות
          </div>
        ) : (
          lines.items.map(({ item, count, unit }) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-bg py-3 last:border-0"
            >
              <div className="flex-1 text-right">
                <div className="text-[0.9rem] font-medium">{item.name}</div>
                <div className="text-[0.8rem] text-neutral-400">
                  {formatPrice(unit, item.price?.currency)} ליחידה
                </div>
              </div>
              <div className="mx-3 flex items-center gap-1.5">
                <QtyBtn onClick={() => removeOneOfType(item.id)}>−</QtyBtn>
                <span className="min-w-5 text-center text-[0.9rem] font-semibold">
                  {count}
                </span>
                <QtyBtn onClick={() => addBox(item.id)}>+</QtyBtn>
              </div>
              <div className="whitespace-nowrap text-[0.95rem] font-semibold">
                {formatPrice(unit * count, item.price?.currency)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t-2 border-ink py-4">
        <span className="text-lg font-semibold">סה&quot;כ</span>
        <span className="text-2xl font-bold">{formatPrice(lines.total)}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onCheckout}
          disabled={empty || busy}
          className="flex-1 rounded-lg bg-brand py-3.5 text-lg font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
        >
          {busy ? "מוסיף לסל..." : "הוספה לסל הקניות"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg border border-line bg-white px-5 py-3.5 text-[0.95rem] font-medium text-muted transition hover:border-brand hover:text-brand"
        >
          נקה הכל
        </button>
      </div>
    </div>
  );
}

function QtyBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-sm transition hover:bg-bg"
    >
      {children}
    </button>
  );
}
