"use client";

import type { FillSize, PlannerApi } from "@/lib/usePlanner";

const OPTIONS: Array<{ value: FillSize; label: string }> = [
  { value: "small", label: "קופסאות קטנות" },
  { value: "medium", label: "קופסאות בינוניות" },
  { value: "large", label: "קופסאות גדולות" },
  { value: "mix", label: "שילוב" },
];

export default function AutoFillPanel({ api }: { api: PlannerApi }) {
  const { fillSize, setFillSize, autoFill, shuffleFill, didFill } = api;
  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <div className="mb-2.5 text-[0.85rem] font-semibold">מילוי אוטומטי</div>
      <div className="mb-2.5 flex flex-col gap-1.5">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-center gap-2 text-[0.82rem]"
          >
            <input
              type="radio"
              name="fill-size"
              checked={fillSize === o.value}
              onChange={() => setFillSize(o.value)}
              className="accent-brand"
            />
            {o.label}
          </label>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={autoFill}
          className="flex-1 rounded-md bg-brand px-2 py-2.5 text-[0.82rem] font-semibold text-white transition hover:bg-brand-dark"
        >
          מלא את החלל
        </button>
        <button
          type="button"
          onClick={shuffleFill}
          disabled={!didFill}
          className="flex-1 rounded-md border border-line bg-bg px-2 py-2.5 text-[0.82rem] font-semibold transition hover:bg-line disabled:cursor-not-allowed disabled:opacity-40"
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}
