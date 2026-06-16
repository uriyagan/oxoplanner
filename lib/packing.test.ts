import assert from "node:assert/strict";
import { test } from "node:test";
import {
  autoPack,
  boxesCollide,
  inBounds,
  utilization,
  type TypeLookup,
} from "./packing.ts";
import type { BoxType, Container, PlacedBox } from "./types.ts";

function box(id: string, w: number, h: number, d: number): BoxType {
  return {
    id,
    wooId: 0,
    name: id,
    category: "x",
    w,
    h,
    d,
    frontImg: "",
    topImg: "",
    sortOrder: 0,
    active: true,
  };
}

const TYPES: BoxType[] = [
  box("a", 100, 100, 100),
  box("b", 160, 240, 160),
  box("c", 80, 80, 80),
];
const lookup: TypeLookup = (id) => TYPES.find((t) => t.id === id);

function place(packed: Omit<PlacedBox, "id">[]): PlacedBox[] {
  return packed.map((p, i) => ({ id: i + 1, ...p }));
}

function assertNoOverlapsInBounds(boxes: PlacedBox[], space: Container) {
  for (const p of boxes) {
    const t = lookup(p.typeId)!;
    assert.ok(inBounds(p, t, space), `box ${p.id} out of bounds`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const ti = lookup(boxes[i].typeId)!;
      const tj = lookup(boxes[j].typeId)!;
      assert.ok(
        !boxesCollide(ti, boxes[i], tj, boxes[j]),
        `boxes ${boxes[i].id} & ${boxes[j].id} overlap`,
      );
    }
  }
}

test("shelf pack: no overlaps, all in bounds", () => {
  const space: Container = { w: 500, h: 400, d: 300 };
  const boxes = place(autoPack(space, TYPES, "shelf", 12345));
  assert.ok(boxes.length > 0);
  assertNoOverlapsInBounds(boxes, space);
});

test("drawer pack: single floor layer, no overlaps", () => {
  const space: Container = { w: 500, h: 400, d: 300 };
  const boxes = place(autoPack(space, TYPES, "drawer", 999));
  assert.ok(boxes.length > 0);
  assertNoOverlapsInBounds(boxes, space);
  for (const b of boxes) assert.equal(b.y, 0, "drawer boxes must sit on the floor");
});

test("deterministic for a given seed", () => {
  const space: Container = { w: 500, h: 400, d: 300 };
  const a = autoPack(space, TYPES, "shelf", 42);
  const b = autoPack(space, TYPES, "shelf", 42);
  assert.deepEqual(a, b);
});

test("utilization never exceeds 100 and reflects volume", () => {
  const space: Container = { w: 300, h: 300, d: 300 };
  const boxes = place(autoPack(space, TYPES, "shelf", 7));
  const u = utilization(space, boxes, lookup);
  assert.ok(u >= 0 && u <= 100);
});

test("tiny container packs nothing oversized", () => {
  const space: Container = { w: 50, h: 50, d: 50 };
  const boxes = place(autoPack(space, TYPES, "shelf", 1));
  assertNoOverlapsInBounds(boxes, space);
});
