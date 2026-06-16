"use client";

export default function UtilBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-2.5">
      <span className="text-[0.8rem] font-semibold text-muted">{pct}%</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[0.8rem] text-muted">ניצול שטח</span>
    </div>
  );
}
