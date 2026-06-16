"use client";

import { useState } from "react";

const STEPS = [
  "בחרו סוג (מדף או מגירה)",
  'הזינו את מידות השטח הזמין בס"מ',
  "עברו בין התצוגות (קדמית או עילית) כדי לוודא שהכל יושב כמו שצריך",
  "לחצו על הוספה לסל הקניות",
  "תתחדשו!",
];

export default function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="עזרה"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 left-5 z-[150] flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-lg transition hover:bg-brand-dark"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[140]"
          onClick={() => setOpen(false)}
          aria-hidden
        >
          <div
            className="absolute bottom-20 left-5 w-[18rem] max-w-[calc(100vw-2.5rem)] rounded-xl border border-line bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-semibold">שימוש בלוח התכנון שלנו</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            <ol className="list-decimal space-y-1.5 pr-4 text-[0.88rem] leading-relaxed text-neutral-700">
              {STEPS.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
