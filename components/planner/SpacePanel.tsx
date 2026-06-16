"use client";

import { useEffect, useRef, useState } from "react";
import { DIM_LIMITS } from "@/lib/config";
import type { Mode } from "@/lib/types";
import type { PlannerApi } from "@/lib/usePlanner";
import { MinusIcon, PlusIcon } from "@/components/icons";

// Shared control size. On mobile fields go 2-per-row (full width of the grid
// cell); on desktop they stack with a fixed width so they all line up.
const CONTROL = "h-9 w-full lg:w-36";

export default function SpacePanel({ api }: { api: PlannerApi }) {
  const { dims, changeDim, setDims, mode, setMode } = api;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-xl border border-line bg-white p-3.5 lg:flex lg:flex-col lg:gap-2.5">
      <div className="col-span-2 text-[0.95rem] font-bold">הגדרת השטח</div>

      <Field label="סוג">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className={`${CONTROL} cursor-pointer rounded-md border border-line bg-bg px-2 text-[0.85rem] font-semibold outline-none focus:border-brand`}
        >
          <option value="shelf">מדף</option>
          <option value="drawer">מגירה</option>
        </select>
      </Field>

      <DimField
        label='רוחב בס"מ'
        value={dims.width}
        onStep={(d) => changeDim("width", d)}
        onSet={(v) => setDims({ width: v })}
      />
      {mode === "shelf" && (
        <DimField
          label='גובה בס"מ'
          value={dims.height}
          onStep={(d) => changeDim("height", d)}
          onSet={(v) => setDims({ height: v })}
        />
      )}
      <DimField
        label='עומק בס"מ'
        value={dims.depth}
        onStep={(d) => changeDim("depth", d)}
        onSet={(v) => setDims({ depth: v })}
      />
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
    <label className="flex flex-col gap-1 text-[0.82rem] lg:flex-row lg:items-center lg:justify-between lg:gap-2">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

function DimField({
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
  // Local text so the user can type freely; clamp only on blur / Enter.
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = () => {
    const v = parseInt(text, 10);
    const clamped = Number.isNaN(v)
      ? value
      : Math.max(DIM_LIMITS.min, Math.min(DIM_LIMITS.max, v));
    onSet(clamped);
    setText(String(clamped));
  };

  return (
    <Field label={label}>
      <div className={`${CONTROL} flex items-center overflow-hidden rounded-md border border-line bg-bg`}>
        <button
          type="button"
          aria-label="הגדל"
          onClick={() => onStep(1)}
          className="flex h-full w-9 flex-shrink-0 items-center justify-center text-neutral-600 hover:bg-line"
        >
          <PlusIcon className="h-2.5 w-2.5" />
        </button>
        <input
          type="number"
          value={text}
          min={DIM_LIMITS.min}
          max={DIM_LIMITS.max}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onSet(Math.max(1, Math.min(DIM_LIMITS.max, v)));
          }}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-center text-[0.9rem] font-semibold outline-none"
        />
        <button
          type="button"
          aria-label="הקטן"
          onClick={() => onStep(-1)}
          className="flex h-full w-9 flex-shrink-0 items-center justify-center text-neutral-600 hover:bg-line"
        >
          <MinusIcon className="h-2.5 w-2.5" />
        </button>
      </div>
    </Field>
  );
}
