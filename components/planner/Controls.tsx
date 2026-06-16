"use client";

import { DIM_LIMITS } from "@/lib/config";
import type { PlannerApi } from "@/lib/usePlanner";

export default function Controls({ api }: { api: PlannerApi }) {
  const { dims, changeDim, setDims, view, setView, mode, utilPct } = api;

  return (
    <div className="flex flex-wrap items-stretch gap-2.5">
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5">
        <DimInput
          label="רוחב"
          value={dims.width}
          onStep={(d) => changeDim("width", d)}
          onSet={(v) => setDims({ width: v })}
        />
        {mode === "shelf" && (
          <DimInput
            label="גובה"
            value={dims.height}
            onStep={(d) => changeDim("height", d)}
            onSet={(v) => setDims({ height: v })}
          />
        )}
        <DimInput
          label="עומק"
          value={dims.depth}
          onStep={(d) => changeDim("depth", d)}
          onSet={(v) => setDims({ depth: v })}
        />
      </div>

      {mode === "shelf" && (
        <div className="flex items-center rounded-xl border border-line bg-white px-1.5 py-1.5">
          <div className="flex overflow-hidden rounded-md border border-line bg-bg">
            <ViewBtn active={view === "front"} onClick={() => setView("front")}>
              תצוגה קדמית
            </ViewBtn>
            <ViewBtn active={view === "top"} onClick={() => setView("top")}>
              תצוגה עילית
            </ViewBtn>
          </div>
        </div>
      )}

      <div className="flex min-w-[180px] flex-1 items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5">
        <span className="text-[0.8rem] font-semibold text-muted">{utilPct}%</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500"
            style={{ width: `${utilPct}%` }}
          />
        </div>
        <span className="whitespace-nowrap text-[0.8rem] text-muted">ניצול שטח</span>
      </div>
    </div>
  );
}

function DimInput({
  label,
  value,
  onStep,
  onSet,
}: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  onSet: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-[0.8rem] text-muted">{label}</span>
      <div className="flex items-center overflow-hidden rounded-md border border-line bg-bg">
        <button
          type="button"
          onClick={() => onStep(1)}
          className="h-[30px] w-[30px] text-base hover:bg-line"
        >
          +
        </button>
        <input
          type="number"
          value={value}
          min={DIM_LIMITS.min}
          max={DIM_LIMITS.max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v))
              onSet(Math.max(DIM_LIMITS.min, Math.min(DIM_LIMITS.max, v)));
          }}
          className="h-[30px] w-10 bg-transparent text-center text-[0.9rem] font-semibold outline-none"
        />
        <button
          type="button"
          onClick={() => onStep(-1)}
          className="h-[30px] w-[30px] text-base hover:bg-line"
        >
          −
        </button>
      </div>
      <span className="text-[0.72rem] text-neutral-400">ס&quot;מ</span>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "whitespace-nowrap px-4 py-2 text-[0.85rem] transition",
        active ? "bg-white font-semibold text-ink" : "text-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
