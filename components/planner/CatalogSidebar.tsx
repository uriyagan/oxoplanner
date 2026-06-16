"use client";

import { useMemo, useState } from "react";
import { CATEGORY_ORDER } from "@/lib/catalog-seed";
import { volumeMm3 } from "@/lib/packing";
import { formatPrice } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";

export default function CatalogSidebar({
  catalog,
  onAdd,
}: {
  catalog: CatalogItem[];
  onAdd: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim();
    const map = new Map<string, CatalogItem[]>();
    for (const item of catalog) {
      if (q && !item.name.includes(q)) continue;
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    const ordered: Array<[string, CatalogItem[]]> = [];
    for (const cat of CATEGORY_ORDER) {
      const arr = map.get(cat);
      if (arr && arr.length) {
        arr.sort((a, b) => volumeMm3(a) - volumeMm3(b));
        ordered.push([cat, arr]);
      }
    }
    return ordered;
  }, [catalog, query]);

  const count = groups.reduce((n, [, arr]) => n + arr.length, 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        <span className="text-[0.95rem] font-semibold">קטלוג קופסאות</span>
        <span className="rounded-full bg-bg px-2 py-0.5 text-[0.72rem] text-muted">
          {count}
        </span>
      </div>
      <div className="border-b border-line px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש..."
          className="w-full rounded-md border border-line px-2.5 py-1.5 text-[0.85rem] outline-none focus:border-brand"
        />
      </div>
      <div className="scroll-thin max-h-[520px] overflow-y-auto p-1.5">
        {groups.map(([cat, items]) => (
          <div key={cat}>
            <div className="px-2 pb-1 pt-2 text-[0.72rem] font-semibold tracking-wide text-muted">
              {cat}
            </div>
            {items.map((item) => (
              <CatalogRow key={item.id} item={item} onAdd={onAdd} />
            ))}
          </div>
        ))}
        {count === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted">
            לא נמצאו קופסאות
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogRow({
  item,
  onAdd,
}: {
  item: CatalogItem;
  onAdd: (id: string) => void;
}) {
  const p = item.price;
  const onSale = !!p?.onSale && p?.salePrice != null;
  return (
    <button
      type="button"
      onClick={() => onAdd(item.id)}
      className="flex w-full items-center gap-2 rounded-lg p-2 text-right transition hover:bg-bg active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.frontImg} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.78rem] font-semibold">
          {item.name}
        </span>
        <span className="block text-[0.7rem] text-neutral-400">
          {item.w / 10}×{item.h / 10}×{item.d / 10} ס"מ
        </span>
      </span>
      <span className="whitespace-nowrap text-[0.8rem] font-bold">
        {onSale ? (
          <>
            <span className="text-brand">{formatPrice(p!.salePrice!, p!.currency)}</span>{" "}
            <span className="text-[0.72rem] font-normal text-neutral-400 line-through">
              {formatPrice(p!.regularPrice, p!.currency)}
            </span>
          </>
        ) : (
          formatPrice(p?.price ?? 0, p?.currency)
        )}
      </span>
    </button>
  );
}
