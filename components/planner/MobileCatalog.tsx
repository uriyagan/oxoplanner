"use client";

import { useState } from "react";
import { formatPrice, isInStock } from "@/lib/format";
import type { CatalogItem } from "@/lib/types";
import BoxImage from "./BoxImage";

export default function MobileCatalog({
  catalog,
  onAdd,
}: {
  catalog: CatalogItem[];
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-[0_4px_20px_rgba(223,0,44,0.4)] lg:hidden"
      >
        + הוספת קופסה
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-semibold">בחרו קופסה להוספה</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-lg hover:bg-line"
              >
                ✕
              </button>
            </div>
            <div className="scroll-thin flex flex-col gap-1.5 overflow-y-auto">
              {catalog.map((item) => {
                const onSale = !!item.price?.onSale && item.price?.salePrice != null;
                const inStock = isInStock(item.price);
                return (
                  <div
                    key={item.id}
                    className={[
                      "flex items-center gap-2.5 rounded-lg border border-line p-2",
                      inStock ? "" : "opacity-55 grayscale",
                    ].join(" ")}
                  >
                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-md">
                      <BoxImage
                        src={item.frontImg}
                        fallbackSrc={item.fallbackImg}
                        lazy
                        className="max-h-full max-w-full object-contain"
                        placeholderClassName="h-9 w-9"
                      />
                    </span>
                    <div className="flex-1 text-right">
                      <div className="text-[0.8rem] font-semibold">{item.name}</div>
                      <div className="text-[0.85rem] font-bold">
                        {!inStock ? (
                          <span className="text-[0.75rem] font-semibold text-muted">
                            לא במלאי
                          </span>
                        ) : onSale ? (
                          <>
                            <span className="text-brand">
                              {formatPrice(item.price!.salePrice!, item.price!.currency)}
                            </span>{" "}
                            <span className="text-[0.72rem] font-normal text-neutral-400 line-through">
                              {formatPrice(item.price!.regularPrice, item.price!.currency)}
                            </span>
                          </>
                        ) : (
                          formatPrice(item.price?.price ?? 0, item.price?.currency)
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdd(item.id)}
                      disabled={!inStock}
                      className="rounded-md bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
                    >
                      {inStock ? "הוספה" : "אזל"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
