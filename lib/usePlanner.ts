"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  autoPack,
  classify,
  findValidPosition,
  utilization,
} from "./packing";
import { DEFAULT_DIMS, DIM_LIMITS } from "./config";
import type {
  CatalogItem,
  Container,
  Mode,
  PlacedBox,
  Vec3,
  ViewType,
} from "./types";

export type FillSize = "small" | "medium" | "large" | "mix";

interface Dims {
  width: number; // cm
  height: number;
  depth: number;
}

const LS_KEY = "oxo2-planner";

interface Persisted {
  placed: PlacedBox[];
  dims: Dims;
  mode: Mode;
}

function loadPersisted(): Partial<Persisted> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

export function usePlanner(catalog: CatalogItem[]) {
  const typeMap = useMemo(
    () => new Map(catalog.map((c) => [c.id, c])),
    [catalog],
  );
  const getType = useCallback((id: string) => typeMap.get(id), [typeMap]);

  const [mode, setModeState] = useState<Mode>("shelf");
  const [view, setView] = useState<ViewType>("front");
  const [dims, setDimsState] = useState<Dims>({ ...DEFAULT_DIMS });
  const [placed, setPlaced] = useState<PlacedBox[]>([]);
  const [fillSize, setFillSize] = useState<FillSize>("mix");
  const [toast, setToast] = useState<string | null>(null);
  const [didFill, setDidFill] = useState(false);

  const idCounter = useRef(1);
  const fillSeed = useRef(1);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const hydrated = useRef(false);

  const container: Container = useMemo(
    () => ({ w: dims.width * 10, h: dims.height * 10, d: dims.depth * 10 }),
    [dims],
  );

  // ── persistence ──────────────────────────────────────────────────
  useEffect(() => {
    const p = loadPersisted();
    if (p) {
      if (p.placed) {
        setPlaced(p.placed);
        idCounter.current =
          p.placed.reduce((m, b) => Math.max(m, b.id), 0) + 1;
      }
      if (p.dims) setDimsState(p.dims);
      if (p.mode) {
        setModeState(p.mode);
        setView(p.mode === "drawer" ? "top" : "front");
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({ placed, dims, mode } satisfies Persisted),
      );
    } catch {
      // ignore quota / privacy errors
    }
  }, [placed, dims, mode]);

  // ── toast ────────────────────────────────────────────────────────
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // ── history ──────────────────────────────────────────────────────
  const snapshot = useCallback(() => {
    undoStack.current.push(JSON.stringify(placed));
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  }, [placed]);

  const applyHistory = useCallback(
    (boxes: PlacedBox[]) => {
      setPlaced(boxes);
      idCounter.current = boxes.reduce((m, b) => Math.max(m, b.id), 0) + 1;
    },
    [],
  );

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    redoStack.current.push(JSON.stringify(placed));
    applyHistory(JSON.parse(prev));
    setHistoryTick((t) => t + 1);
  }, [placed, applyHistory]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(JSON.stringify(placed));
    applyHistory(JSON.parse(next));
    setHistoryTick((t) => t + 1);
  }, [placed, applyHistory]);

  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;
  void historyTick; // re-render trigger for canUndo/canRedo

  // ── mode / dims ──────────────────────────────────────────────────
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setView(m === "drawer" ? "top" : "front");
  }, []);

  const setDims = useCallback((partial: Partial<Dims>) => {
    setDimsState((d) => ({ ...d, ...partial }));
  }, []);

  const changeDim = useCallback((dim: keyof Dims, delta: number) => {
    setDimsState((d) => ({
      ...d,
      [dim]: Math.max(DIM_LIMITS.min, Math.min(DIM_LIMITS.max, d[dim] + delta)),
    }));
  }, []);

  // ── box operations ───────────────────────────────────────────────
  const addBox = useCallback(
    (typeId: string) => {
      const type = getType(typeId);
      if (!type) return;
      const pos = findValidPosition(type, container, mode, placed, getType);
      if (!pos) {
        showToast("אין מקום פנוי לקופסה זו");
        return;
      }
      snapshot();
      setPlaced((p) => [
        ...p,
        { id: idCounter.current++, typeId, x: pos.x, y: pos.y, z: pos.z },
      ]);
    },
    [getType, container, mode, placed, snapshot, showToast],
  );

  const removeBox = useCallback(
    (instanceId: number) => {
      snapshot();
      setPlaced((p) => p.filter((b) => b.id !== instanceId));
    },
    [snapshot],
  );

  const removeOneOfType = useCallback(
    (typeId: string) => {
      snapshot();
      setPlaced((p) => {
        const idx = [...p].reverse().findIndex((b) => b.typeId === typeId);
        if (idx === -1) return p;
        const realIdx = p.length - 1 - idx;
        return p.filter((_, i) => i !== realIdx);
      });
    },
    [snapshot],
  );

  /** Authoritative commit of a dragged box to a resolved, valid position. */
  const moveBox = useCallback(
    (instanceId: number, pos: Vec3) => {
      snapshot();
      setPlaced((p) =>
        p.map((b) => (b.id === instanceId ? { ...b, ...pos } : b)),
      );
    },
    [snapshot],
  );

  const clearAll = useCallback(() => {
    if (placed.length === 0) return;
    snapshot();
    setPlaced([]);
    idCounter.current = 1;
    setDidFill(false);
    showToast("כל הקופסאות הוסרו");
  }, [placed.length, snapshot, showToast]);

  // ── auto-fill ────────────────────────────────────────────────────
  const runFill = useCallback(
    (seed: number) => {
      const available = catalog.filter((c) =>
        fillSize === "mix" ? true : classify(c) === fillSize,
      );
      if (available.length === 0) {
        showToast("אין קופסאות בגודל שנבחר");
        return;
      }
      const packed = autoPack(container, available, mode, seed);
      let next = idCounter.current;
      const boxes: PlacedBox[] = packed.map((b) => ({ id: next++, ...b }));
      idCounter.current = next;
      setPlaced(boxes);
      setDidFill(true);
      if (boxes.length === 0) showToast("לא הצלחנו למקם קופסאות במידות אלו");
    },
    [catalog, fillSize, container, mode, showToast],
  );

  const autoFill = useCallback(() => {
    snapshot();
    fillSeed.current = (Date.now() & 0x7fffffff) || 1;
    runFill(fillSeed.current);
  }, [snapshot, runFill]);

  const shuffleFill = useCallback(() => {
    snapshot();
    fillSeed.current += 1;
    runFill(fillSeed.current);
  }, [snapshot, runFill]);

  // ── derived ──────────────────────────────────────────────────────
  const utilPct = useMemo(
    () => utilization(container, placed, getType),
    [container, placed, getType],
  );

  return {
    catalog,
    getType,
    mode,
    setMode,
    view,
    setView,
    dims,
    setDims,
    changeDim,
    container,
    placed,
    moveBox,
    addBox,
    removeBox,
    removeOneOfType,
    clearAll,
    fillSize,
    setFillSize,
    autoFill,
    shuffleFill,
    didFill,
    utilPct,
    undo,
    redo,
    canUndo,
    canRedo,
    toast,
    showToast,
  };
}

export type PlannerApi = ReturnType<typeof usePlanner>;
