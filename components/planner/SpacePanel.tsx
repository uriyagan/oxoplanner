"use client";

import { useEffect, useRef, useState } from "react";
import { DIM_LIMITS } from "@/lib/config";
import type { Mode } from "@/lib/types";
import type { PlannerApi } from "@/lib/usePlanner";

const FIELD_W = "w-28"; // every control shares this exact width

export default function SpacePanel({ api }: { api: PlannerApi }) {
  const { dims, changeDim, setDims, mode, setMode } = api;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-3.5">
      <div className="text-[0.95rem] font-semibold">הגדרת השטח</div>

      <Row label="סוג">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className={`h-[30px] ${FIELD_W} cursor-pointer rounded-md border border-line bg-bg px-2 text-[0.85rem] font-semibold outline-none focus:border-brand`}
        >
          <option value="shelf">מדף</option>
          <option value="drawer">מגירה</option>
        </select>
      </Row>

      <DimRow
        label='רוחב בס"מ'
        value={dims.width}
        onStep={(d) => changeDim("width", d)}
        onSet={(v) => setDims({ width: v })}
      />
      {mode === "shelf" && (
        <DimRow
          label='גובה בס"מ'
          value={dims.height}
          onStep={(d) => changeDim("height", d)}
          onSet={(v) => setDims({ height: v })}
        />
      )}
      <DimRow
        label='עומק בס"מ'
        value={dims.depth}
        onStep={(d) => changeDim("depth", d)}
        onSet={(v) => setDims({ depth: v })}
      />
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-[0.82rem]">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}

function DimRow({
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
    <Row label={label}>
      <div
        className={`flex h-[30px] ${FIELD_W} items-center overflow-hidden rounded-md border border-line bg-bg`}
      >
        <button
          type="button"
          onClick={() => onStep(1)}
          className="h-full w-[30px] flex-shrink-0 text-base hover:bg-line"
        >
          +
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
          onClick={() => onStep(-1)}
          className="h-full w-[30px] flex-shrink-0 text-base hover:bg-line"
        >
          −
        </button>
      </div>
    </Row>
  );
}
