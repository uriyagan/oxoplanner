"use client";

import { useEffect, useState } from "react";
import { usePlanner } from "@/lib/usePlanner";
import { buildCartLines, checkout } from "@/lib/cart";
import type { CatalogItem } from "@/lib/types";
import CatalogSidebar from "./CatalogSidebar";
import AutoFillPanel from "./AutoFillPanel";
import SpacePanel from "./SpacePanel";
import Canvas from "./Canvas";
import OrderSummary from "./OrderSummary";
import MobileCatalog from "./MobileCatalog";
import HelpButton from "./HelpButton";
import Toast from "./Toast";

export default function Planner({ catalog }: { catalog: CatalogItem[] }) {
  const api = usePlanner(catalog);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        api.undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        api.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  const onCheckout = async () => {
    const lines = buildCartLines(api.placed, catalog);
    if (lines.length === 0) {
      api.showToast("לא ניתן להוסיף לסל");
      return;
    }
    setBusy(true);
    try {
      await checkout(lines);
    } catch {
      setBusy(false);
      api.showToast("שגיאה בהוספה לסל");
    }
  };

  return (
    <div className="w-full px-4 pb-28 pt-5 md:px-[60px] lg:pb-10">
      <Toast message={api.toast} />

      {busy && (
        <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-5 bg-black/70">
          <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-brand animate-oxo-spin" />
          <div className="text-xl font-semibold text-white">מוסיף לסל הקניות...</div>
        </div>
      )}

      <header className="mb-6 flex justify-center pt-5">
        <a href="https://www.uniqook.co.il" target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/uniqook-logo.svg"
            alt="UNIQOOK"
            width={260}
            className="h-auto w-[260px]"
          />
        </a>
      </header>

      {/* mobile: size settings go above the canvas */}
      <div className="mt-5 lg:hidden">
        <SpacePanel api={api} />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:flex-row lg:items-stretch">
        {/* right: space settings + catalog + auto-fill */}
        <aside className="hidden w-64 flex-shrink-0 flex-col gap-3 lg:flex">
          <SpacePanel api={api} />
          <CatalogSidebar catalog={catalog} onAdd={api.addBox} />
          <AutoFillPanel api={api} />
        </aside>

        {/* center: canvas (matches the right menu height) */}
        <section className="flex min-h-[55vh] min-w-0 flex-1 flex-col lg:min-h-[460px]">
          <Canvas api={api} />
        </section>

        {/* left: order summary */}
        <aside className="hidden w-80 flex-shrink-0 self-start lg:block">
          <OrderSummary api={api} onCheckout={onCheckout} busy={busy} />
        </aside>
      </div>

      {/* mobile: auto-fill + order summary below the canvas */}
      <div className="mt-4 flex flex-col gap-4 lg:hidden">
        <AutoFillPanel api={api} />
        <OrderSummary api={api} onCheckout={onCheckout} busy={busy} />
      </div>

      <MobileCatalog catalog={catalog} onAdd={api.addBox} />
      <HelpButton />
    </div>
  );
}
