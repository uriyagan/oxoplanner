"use client";

export default function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={[
        "pointer-events-none fixed left-1/2 top-5 z-[2000] -translate-x-1/2 rounded-lg bg-ink px-7 py-3.5 text-[0.95rem] font-medium text-white transition-all duration-300",
        message ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
