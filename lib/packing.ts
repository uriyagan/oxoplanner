import type { BoxType, Container, Mode, PlacedBox, Vec3 } from "./types";

// ── Geometry helpers ────────────────────────────────────────────────

export function volumeMm3(b: Pick<BoxType, "w" | "h" | "d">): number {
  return b.w * b.h * b.d;
}

export function volumeL(b: Pick<BoxType, "w" | "h" | "d">): number {
  return volumeMm3(b) / 1_000_000;
}

export function classify(b: Pick<BoxType, "w" | "h" | "d">): "small" | "medium" | "large" {
  const v = volumeMm3(b);
  if (v <= 800_000) return "small"; // up to ~0.8 L
  if (v <= 3_000_000) return "medium"; // up to ~3 L
  return "large";
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && a2 > b1;
}

export function boxesCollide(tA: BoxType, pA: Vec3, tB: BoxType, pB: Vec3): boolean {
  return (
    rangesOverlap(pA.x, pA.x + tA.w, pB.x, pB.x + tB.w) &&
    rangesOverlap(pA.y, pA.y + tA.h, pB.y, pB.y + tB.h) &&
    rangesOverlap(pA.z, pA.z + tA.d, pB.z, pB.z + tB.d)
  );
}

export type TypeLookup = (id: string) => BoxType | undefined;

export function isPositionValid(
  pos: Vec3,
  type: BoxType,
  placed: PlacedBox[],
  getType: TypeLookup,
  excludeId: number | null,
): boolean {
  for (const o of placed) {
    if (excludeId !== null && o.id === excludeId) continue;
    const ot = getType(o.typeId);
    if (!ot) continue;
    if (boxesCollide(type, pos, ot, o)) return false;
  }
  return true;
}

export function inBounds(pos: Vec3, type: BoxType, space: Container): boolean {
  return (
    pos.x >= 0 &&
    pos.y >= 0 &&
    pos.z >= 0 &&
    pos.x + type.w <= space.w + 0.01 &&
    pos.y + type.h <= space.h + 0.01 &&
    pos.z + type.d <= space.d + 0.01
  );
}

/** A box is supported if it sits on the floor or is fully held by boxes below. */
export function hasSupport(
  pos: Vec3,
  type: BoxType,
  placed: PlacedBox[],
  getType: TypeLookup,
  excludeId: number | null,
): boolean {
  if (pos.y <= 0.01) return true;
  for (const o of placed) {
    if (excludeId !== null && o.id === excludeId) continue;
    const ot = getType(o.typeId);
    if (!ot) continue;
    if (Math.abs(pos.y - (o.y + ot.h)) > 0.01) continue;
    if (!rangesOverlap(pos.x, pos.x + type.w, o.x, o.x + ot.w)) continue;
    if (!rangesOverlap(pos.z, pos.z + type.d, o.z, o.z + ot.d)) continue;
    const fitsW = pos.x >= o.x - 0.01 && pos.x + type.w <= o.x + ot.w + 0.01;
    const fitsD = pos.z >= o.z - 0.01 && pos.z + type.d <= o.z + ot.d + 0.01;
    if (fitsW && fitsD) return true;
  }
  return false;
}

/** Lowest valid y (resting height) for a footprint at (x,z), or null if none. */
export function findSupportY(
  x: number,
  z: number,
  type: BoxType,
  space: Container,
  placed: PlacedBox[],
  getType: TypeLookup,
  excludeId: number | null,
): number | null {
  const floor: Vec3 = { x, y: 0, z };
  if (isPositionValid(floor, type, placed, getType, excludeId)) return 0;
  const candidates: number[] = [];
  for (const o of placed) {
    if (excludeId !== null && o.id === excludeId) continue;
    const ot = getType(o.typeId);
    if (!ot) continue;
    if (
      rangesOverlap(x, x + type.w, o.x, o.x + ot.w) &&
      rangesOverlap(z, z + type.d, o.z, o.z + ot.d)
    ) {
      candidates.push(o.y + ot.h);
    }
  }
  candidates.sort((a, b) => a - b);
  for (const y of candidates) {
    if (y + type.h > space.h + 0.01) continue;
    const pos: Vec3 = { x, y, z };
    if (
      isPositionValid(pos, type, placed, getType, excludeId) &&
      hasSupport(pos, type, placed, getType, excludeId)
    )
      return y;
  }
  return null;
}

// ── Seeded RNG (deterministic "try again") ──────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 2D skyline (bottom-left) packer ─────────────────────────────────
// Packs axis-aligned rectangles into a planeW × planeH plane.
// Each input rect has { w, h } (h = the plane's vertical extent for that box).

interface Rect2D {
  ref: number; // index into the source box list
  w: number;
  h: number;
}
interface Seg {
  x: number;
  w: number;
  y: number;
}
export interface Placement2D {
  ref: number;
  x: number;
  y: number;
}

function packPlane(
  planeW: number,
  planeH: number,
  rects: Rect2D[],
  rnd: () => number,
): Placement2D[] {
  if (rects.length === 0 || planeW <= 0 || planeH <= 0) return [];
  const fittable = rects.filter((r) => r.w <= planeW && r.h <= planeH);
  if (fittable.length === 0) return [];

  let segs: Seg[] = [{ x: 0, w: planeW, y: 0 }];
  const out: Placement2D[] = [];
  const maxIter = 20000;

  for (let iter = 0; iter < maxIter; iter++) {
    // lowest, then leftmost segment
    let si = 0;
    for (let i = 1; i < segs.length; i++) {
      if (segs[i].y < segs[si].y - 0.01) si = i;
    }
    const seg = segs[si];
    const remaining = planeH - seg.y;

    // choose a box: among those that fit, prefer widest then tallest,
    // with a little seeded jitter so "try again" varies the layout.
    let best: Rect2D | null = null;
    let bestScore = -Infinity;
    for (const r of fittable) {
      if (r.w > seg.w + 0.01 || r.h > remaining + 0.01) continue;
      const score = r.w * 1000 + r.h + rnd() * 40;
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }

    if (!best) {
      // nothing fits here → raise this segment to its lowest neighbour
      const left = si > 0 ? segs[si - 1].y : Infinity;
      const right = si < segs.length - 1 ? segs[si + 1].y : Infinity;
      const raiseTo = Math.min(left, right);
      if (!isFinite(raiseTo)) break; // whole plane, can't raise → done
      seg.y = raiseTo;
      segs = mergeSegs(segs);
      continue;
    }

    out.push({ ref: best.ref, x: seg.x, y: seg.y });
    const placedTop = seg.y + best.h;
    const leftover = seg.w - best.w;
    const newSegs: Seg[] = [{ x: seg.x, w: best.w, y: placedTop }];
    if (leftover > 0.01) newSegs.push({ x: seg.x + best.w, w: leftover, y: seg.y });
    segs.splice(si, 1, ...newSegs);
    segs = mergeSegs(segs);
  }
  return out;
}

function mergeSegs(segs: Seg[]): Seg[] {
  const sorted = segs.slice().sort((a, b) => a.x - b.x);
  const merged: Seg[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && Math.abs(last.y - s.y) < 0.01 && Math.abs(last.x + last.w - s.x) < 0.01) {
      last.w += s.w;
    } else {
      merged.push({ ...s });
    }
  }
  return merged;
}

// ── Single-placement search (for "add one box") ─────────────────────

export function findValidPosition(
  type: BoxType,
  space: Container,
  mode: Mode,
  placed: PlacedBox[],
  getType: TypeLookup,
): Vec3 | null {
  if (type.w > space.w || type.h > space.h || type.d > space.d) return null;
  const step = 10;

  if (mode === "drawer") {
    for (let z = 0; z <= space.d - type.d + 0.01; z += step) {
      for (let x = 0; x <= space.w - type.w + 0.01; x += step) {
        const pos: Vec3 = { x, y: 0, z };
        if (isPositionValid(pos, type, placed, getType, null)) return pos;
      }
    }
    return null;
  }

  // shelf: floor first (front), then stack onto existing front columns
  for (let x = 0; x <= space.w - type.w + 0.01; x += step) {
    const pos: Vec3 = { x, y: 0, z: 0 };
    if (isPositionValid(pos, type, placed, getType, null)) return pos;
  }
  const tops = placed
    .filter((p) => p.z === 0)
    .map((p) => {
      const t = getType(p.typeId)!;
      return { x: p.x, y: p.y + t.h, w: t.w };
    })
    .sort((a, b) => a.y - b.y);
  for (const t of tops) {
    if (t.y + type.h > space.h) continue;
    const xs = [Math.max(0, Math.min(t.x + (t.w - type.w) / 2, space.w - type.w))];
    for (let x = t.x; x <= t.x + t.w - type.w + 0.01; x += step) xs.push(x);
    for (const x0 of xs) {
      const x = Math.max(0, Math.min(x0, space.w - type.w));
      const pos: Vec3 = { x, y: t.y, z: 0 };
      if (
        isPositionValid(pos, type, placed, getType, null) &&
        hasSupport(pos, type, placed, getType, null)
      )
        return pos;
    }
  }
  return null;
}

// ── Auto-pack (fill the whole space) ────────────────────────────────

export function autoPack(
  space: Container,
  available: BoxType[],
  mode: Mode,
  seed: number,
): Omit<PlacedBox, "id">[] {
  const rnd = mulberry32(seed);
  const pool = shuffled(available, rnd);
  if (pool.length === 0) return [];

  if (mode === "drawer") {
    // top plane = (W × D), single floor layer
    const rects: Rect2D[] = pool.map((b, i) => ({ ref: i, w: b.w, h: b.d }));
    const placed2d = packPlane(space.w, space.d, rects, rnd);
    return placed2d.map((p) => ({ typeId: pool[p.ref].id, x: p.x, y: 0, z: p.y }));
  }

  // shelf: pack the front wall (W × H), then replicate each box back in depth
  const rects: Rect2D[] = pool.map((b, i) => ({ ref: i, w: b.w, h: b.h }));
  const front = packPlane(space.w, space.h, rects, rnd);
  const result: Omit<PlacedBox, "id">[] = [];
  for (const p of front) {
    const b = pool[p.ref];
    for (let z = 0; z + b.d <= space.d + 0.01; z += b.d) {
      result.push({ typeId: b.id, x: p.x, y: p.y, z });
    }
  }
  return result;
}

// ── Truthful utilisation ────────────────────────────────────────────
// Fraction of the container volume physically occupied by in-bounds boxes.
// Because placements are validated non-overlapping, this never overstates fit.

export function utilization(
  space: Container,
  placed: PlacedBox[],
  getType: TypeLookup,
): number {
  const total = space.w * space.h * space.d;
  if (total <= 0) return 0;
  let used = 0;
  for (const p of placed) {
    const t = getType(p.typeId);
    if (!t) continue;
    if (!inBounds(p, t, space)) continue;
    used += volumeMm3(t);
  }
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}
