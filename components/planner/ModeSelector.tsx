"use client";

import type { Mode } from "@/lib/types";

const MODES: Array<{ id: Mode; icon: string; label: string; desc: string }> = [
  { id: "shelf", icon: "📚", label: "מדף", desc: "תצוגה קדמית + עילית" },
  { id: "drawer", icon: "🗄️", label: "מגירה", desc: "תצוגה עילית בלבד" },
];

export default function ModeSelector({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={[
              "flex min-w-[150px] flex-col items-center gap-1.5 rounded-xl border-2 bg-white px-8 py-4 transition",
              active ? "border-brand" : "border-line hover:border-brand/60",
            ].join(" ")}
          >
            <span className={["text-3xl", active ? "" : "grayscale"].join(" ")}>
              {m.icon}
            </span>
            <span className="text-[0.95rem] font-semibold">{m.label}</span>
            <span className="text-[0.72rem] text-muted">{m.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
