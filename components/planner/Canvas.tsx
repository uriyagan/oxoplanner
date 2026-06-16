"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  findSupportY,
  hasSupport,
  inBounds,
  isPositionValid,
  volumeL,
} from "@/lib/packing";
import type { BoxType, PlacedBox, Vec3 } from "@/lib/types";
import type { PlannerApi } from "@/lib/usePlanner";
import {
  BinIcon,
  FitIcon,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";

interface DragState {
  id: number;
  type: BoxType;
  startClientX: number;
  startClientY: number;
  startX: number;
  startVal: number;
  pos: Vec3;
  collision: boolean;
}

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3;

export default function Canvas({ api }: { api: PlannerApi }) {
  const { container, placed, view, setView, mode, getType, moveBox } = api;
  const viewportRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(0.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  dragRef.current = drag;

  // vertical extent of the current view (mm)
  const planeH = view === "front" ? container.h : container.d;
  const planeW = container.w;
  const pxW = planeW * zoom;
  const pxH = planeH * zoom;

  // ── fit-to-viewport ──────────────────────────────────────────────
  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 72;
    const z = Math.max(
      ZOOM_MIN,
      Math.min(
        ZOOM_MAX,
        Math.min((vp.clientWidth - pad) / planeW, (vp.clientHeight - pad) / planeH),
      ),
    );
    setZoom(z);
    setPan({
      x: (vp.clientWidth - planeW * z) / 2,
      y: (vp.clientHeight - planeH * z) / 2,
    });
  }, [planeW, planeH]);

  useLayoutEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.w, container.h, container.d, view, mode]);

  // recenter on resize
  useEffect(() => {
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  const changeZoom = (delta: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const nz = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
    if (nz === zoom) return;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const ratio = nz / zoom;
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio });
    setZoom(nz);
  };

  // ── panning (drag empty area) ────────────────────────────────────
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(
    null,
  );
  const onViewportPointerDown = (e: React.PointerEvent) => {
    // Boxes (and their controls) call stopPropagation on pointer-down, so if the
    // event reaches the viewport it means the user grabbed empty space / the
    // shelf itself → pan the canvas. Works for mouse and touch.
    panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    viewportRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onViewportPointerMove = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    setPan({ x: p.px + (e.clientX - p.sx), y: p.py + (e.clientY - p.sy) });
  };
  const endPan = () => {
    panRef.current = null;
  };

  // ── box dragging ─────────────────────────────────────────────────
  const verticalVal = (b: PlacedBox) => (view === "front" ? b.y : b.z);
  const extent = (t: BoxType) => (view === "front" ? t.h : t.d);

  const buildPos = (b: PlacedBox, x: number, val: number): Vec3 =>
    view === "front" ? { x, y: val, z: b.z } : { x, y: b.y, z: val };

  const clampX = (x: number, t: BoxType) =>
    Math.max(0, Math.min(x, container.w - t.w));
  const clampVal = (val: number, t: BoxType) =>
    Math.max(0, Math.min(val, planeH - extent(t)));

  const snapNear = useCallback(
    (b: PlacedBox, t: BoxType, desiredX: number, desiredVal: number): Vec3 | null => {
      let best: Vec3 | null = null;
      let bestDist = Infinity;
      for (const o of placed) {
        if (o.id === b.id) continue;
        const ot = getType(o.typeId);
        if (!ot) continue;
        const ox = o.x;
        const ow = ot.w;
        const oval = verticalVal(o);
        const oext = extent(ot);
        const combos: Array<[number, number]> = [
          [ox - t.w, desiredVal],
          [ox + ow, desiredVal],
          [desiredX, oval - extent(t)],
          [desiredX, oval + oext],
          [ox - t.w, oval + oext],
          [ox + ow, oval + oext],
          [ox - t.w, oval - extent(t)],
          [ox + ow, oval - extent(t)],
        ];
        for (const [cx0, cv0] of combos) {
          const cx = clampX(cx0, t);
          const cv = clampVal(cv0, t);
          const pos = buildPos(b, cx, cv);
          if (!isPositionValid(pos, t, placed, getType, b.id)) continue;
          const dist = Math.hypot(cx - desiredX, cv - desiredVal);
          if (dist < bestDist) {
            bestDist = dist;
            best = pos;
          }
        }
      }
      return best;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed, getType, view, container.w, planeH],
  );

  const onBoxPointerDown = (e: React.PointerEvent, b: PlacedBox) => {
    e.stopPropagation();
    const t = getType(b.typeId);
    if (!t) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({
      id: b.id,
      type: t,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: b.x,
      startVal: verticalVal(b),
      pos: { x: b.x, y: b.y, z: b.z },
      collision: false,
    });
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const b = placed.find((p) => p.id === d.id);
      if (!b) return;
      const dx = (e.clientX - d.startClientX) / zoom;
      const dUp = (d.startClientY - e.clientY) / zoom;
      const desiredX = clampX(d.startX + dx, d.type);
      const desiredVal = clampVal(d.startVal + dUp, d.type);
      const tryPos = buildPos(b, desiredX, desiredVal);
      if (isPositionValid(tryPos, d.type, placed, getType, d.id)) {
        setDrag({ ...d, pos: tryPos, collision: false });
      } else {
        const snapped = snapNear(b, d.type, desiredX, desiredVal);
        setDrag({ ...d, pos: snapped ?? d.pos, collision: true });
      }
    };
    const onUp = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      const b = placed.find((p) => p.id === d.id);
      if (!b) return;
      let final = d.pos;
      // shelf: gently settle onto whatever's directly below, but never reject
      // the drop — the customer can arrange boxes however they like.
      if (mode !== "drawer" && !hasSupport(final, d.type, placed, getType, d.id)) {
        const sy = findSupportY(
          final.x,
          final.z,
          d.type,
          container,
          placed,
          getType,
          d.id,
        );
        if (sy !== null) final = { ...final, y: sy };
        // if nothing's below, leave it where it was dropped (floating is fine)
      }
      if (final.x !== b.x || final.y !== b.y || final.z !== b.z) {
        moveBox(d.id, final);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, zoom, placed, mode, container, snapNear]);

  // ── render boxes ─────────────────────────────────────────────────
  const ordered = [...placed].sort((a, b) =>
    view === "front" ? b.z - a.z : 0,
  );

  return (
    <div className="relative h-[52vh] min-h-[340px] overflow-hidden rounded-xl bg-canvas lg:h-full lg:min-h-[460px]">
      <div
        ref={viewportRef}
        className="absolute inset-0 isolate cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onWheel={(e) => {
            changeZoom(e.deltaY < 0 ? 0.08 : -0.08);
          }}
        >
          {placed.length === 0 && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-[0.95rem] text-muted">
              בחרו קופסה מהקטלוג כדי להתחיל
            </div>
          )}
          <div
            ref={planeRef}
            className="absolute"
            style={{ left: pan.x, top: pan.y, width: pxW, height: pxH }}
          >
            {/* shelf / drawer outline */}
            <div className="absolute inset-0 rounded-[3px] border-2 border-ink bg-white" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
            <div className="absolute bottom-0 left-0 top-0 w-[2px] bg-ink" />
            <div className="absolute bottom-0 right-0 top-0 w-[2px] bg-ink" />

            {/* rulers */}
            <Ruler axis="h" label={`${planeW / 10} ס"מ`} />
            <Ruler axis="v" label={`${planeH / 10} ס"מ`} />

            {ordered.map((b) => {
              const t = getType(b.typeId);
              if (!t) return null;
              const isDragged = drag?.id === b.id;
              const pos = isDragged ? drag!.pos : b;
              const vVal = view === "front" ? pos.y : pos.z;
              const boxW = t.w * zoom;
              const boxH = extent(t) * zoom;
              const left = pos.x * zoom;
              const bottom = vVal * zoom;
              const oob = !inBounds(pos, t, container);
              const inBack = view === "front" && pos.z > 0;
              return (
                <div
                  key={b.id}
                  onPointerDown={(e) => onBoxPointerDown(e, b)}
                  className={[
                    "group absolute cursor-grab touch-none select-none rounded-[1px] animate-box-appear",
                    isDragged ? "z-[1000] cursor-grabbing shadow-2xl" : "",
                    drag?.id === b.id && drag.collision
                      ? "outline outline-2 outline-brand"
                      : "",
                    oob ? "opacity-60 outline-2 outline-dashed outline-brand" : "",
                    inBack ? "opacity-50" : "",
                  ].join(" ")}
                  style={{
                    left,
                    bottom,
                    width: boxW,
                    height: boxH,
                    zIndex: isDragged ? 1000 : 100 - Math.floor(pos.z / 10),
                  }}
                >
                  {view === "top" && t.w !== t.d ? (
                    // Non-square footprint: the lid art is drawn long-side
                    // horizontal, so rotate it 90° to align with the box depth
                    // while still stretching to fill the whole footprint.
                    <img
                      src={t.topImg}
                      alt=""
                      draggable={false}
                      style={{
                        position: "absolute",
                        width: boxH,
                        height: boxW,
                        maxWidth: "none",
                        top: (boxH - boxW) / 2,
                        left: (boxW - boxH) / 2,
                        objectFit: "fill",
                        transform: "rotate(90deg)",
                      }}
                    />
                  ) : (
                    <img
                      src={view === "top" ? t.topImg : t.frontImg}
                      alt=""
                      draggable={false}
                      className="block h-full w-full"
                      style={{ objectFit: "fill" }}
                    />
                  )}
                  <span
                    dir="ltr"
                    className="pointer-events-none absolute bottom-[3px] left-1/2 -translate-x-1/2 text-[9px] font-bold text-black/45 [text-shadow:0_0_3px_rgba(255,255,255,0.85)]"
                  >
                    {volumeL(t).toFixed(1)}L
                  </span>
                  <button
                    type="button"
                    aria-label="הסר"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      api.removeBox(b.id);
                    }}
                    className="absolute -left-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow group-hover:flex"
                  >
                    <BinIcon className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <UtilRing pct={api.utilPct} />

        {/* floating zoom / undo controls — must stay above the boxes */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 lg:left-3 lg:translate-x-0">
          <div className="pointer-events-auto flex flex-wrap items-center justify-start gap-x-2 gap-y-1.5 rounded-xl border border-line bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
            {mode === "shelf" && (
              <div className="flex overflow-hidden rounded-md border border-line bg-bg">
                <ViewBtn active={view === "front"} onClick={() => setView("front")}>
                  קדמית
                </ViewBtn>
                <ViewBtn active={view === "top"} onClick={() => setView("top")}>
                  עילית
                </ViewBtn>
              </div>
            )}
            <div className="flex items-center gap-1">
              <CtrlBtn onClick={api.undo} disabled={!api.canUndo} title="ביטול (Ctrl+Z)" square>
                <UndoIcon className="h-3.5 w-3.5" />
              </CtrlBtn>
              <CtrlBtn onClick={api.redo} disabled={!api.canRedo} title="שחזור (Ctrl+Y)" square>
                <RedoIcon className="h-3.5 w-3.5" />
              </CtrlBtn>
              <CtrlBtn onClick={fit} title="איפוס תצוגה" square>
                <FitIcon className="h-3.5 w-3.5" />
              </CtrlBtn>
            </div>
            <div className="flex items-center gap-1">
              <CtrlBtn onClick={() => changeZoom(-0.1)} title="הקטנה" square>
                <MinusIcon className="h-3 w-3" />
              </CtrlBtn>
              <span className="min-w-[40px] text-center text-[0.82rem] text-muted">
                {Math.round(zoom * 100)}%
              </span>
              <CtrlBtn onClick={() => changeZoom(0.1)} title="הגדלה" square>
                <PlusIcon className="h-3 w-3" />
              </CtrlBtn>
            </div>
          </div>
        </div>
    </div>
  );
}

function UtilRing({ pct }: { pct: number }) {
  const size = 76;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20 hidden lg:block">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="white"
            stroke="#e6e6e6"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#df002c"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[0.95rem] font-bold leading-none">{pct}%</span>
          <span className="mt-0.5 text-[0.5rem] leading-tight text-muted">
            ניצול שטח
          </span>
        </div>
      </div>
    </div>
  );
}

function Ruler({ axis, label }: { axis: "h" | "v"; label: string }) {
  if (axis === "h") {
    return (
      <div className="absolute -bottom-6 left-0 right-0 flex h-4 items-center justify-center">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-neutral-400" />
        <span className="relative z-10 bg-canvas px-1 text-[11px] font-semibold text-muted">
          {label}
        </span>
      </div>
    );
  }
  return (
    <div className="absolute -left-6 bottom-0 top-0 flex w-4 items-center justify-center">
      <div className="absolute bottom-0 left-1/2 top-0 w-px bg-neutral-400" />
      <span className="relative z-10 bg-canvas px-px py-1 text-[11px] font-semibold text-muted [writing-mode:vertical-rl]">
        {label}
      </span>
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
        "px-3 py-1 text-[0.8rem] transition",
        active ? "bg-brand font-semibold text-white" : "text-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  title,
  square,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  square?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex h-[30px] items-center justify-center gap-1 rounded-md border border-line bg-white text-[0.82rem] text-neutral-600 transition hover:bg-bg disabled:cursor-not-allowed disabled:opacity-35",
        square ? "w-[30px] text-base" : "px-2.5",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
