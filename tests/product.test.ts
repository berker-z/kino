// replay (a stepped scene made seek-safe) and overlap (shot changes without
// cuts), from the Copland launch film (works/copland-launch).

import {test} from "node:test";
import assert from "node:assert/strict";
import {replay, type Steppable} from "../src/arrange/replay";
import {overlapAt} from "../src/arrange/overlap";

// A scene whose state depends on every step: position integrates a speed
// that the story changes, the way a bead's travel does on /wired.
class Toy implements Steppable<number> {
  x = 0;
  speed = 1;
  drawn = 0;
  step(dt: number) { this.x += this.speed * dt; }
  apply(speed: number) { this.speed = speed; }
  draw() { this.drawn++; }
}
const story = [{t: 0, data: 1}, {t: 2, data: 3}, {t: 5, data: 0.5}];

test("replay: the state at t is the same whatever was asked before", () => {
  const fresh = (t: number) => replay({create: () => new Toy(), story}).at(t).x;
  const r = replay({create: () => new Toy(), story});
  for (const t of [7.3, 1.1, 4.0, 4.0, 0, 6.25, 2.5]) assert.ok(Math.abs(r.at(t).x - fresh(t)) < 1e-9, `t ${t}`);
});

test("replay: forward calls continue, backward calls rebuild", () => {
  const r = replay({create: () => new Toy(), story});
  r.at(1); r.at(2); r.at(3);
  assert.equal(r.rebuilds, 1);
  r.at(2.5);
  assert.equal(r.rebuilds, 2);
});

test("replay: story changes land at their times", () => {
  const r = replay({create: () => new Toy(), story});
  // 2 s at 1, 3 s at 3, then 1 s at 0.5
  assert.ok(Math.abs(r.at(6).x - (2 + 9 + 0.5)) < 1e-9);
});

test("replay: rate scales the scene's clock", () => {
  const r = replay({create: () => new Toy(), rate: () => 2});
  assert.ok(Math.abs(r.at(3).x - 6) < 1e-9);
});

test("overlapAt: one shot outside blends, two inside with a rising alpha", () => {
  const shots = [{id: "a", from: 0, to: 5}, {id: "b", from: 5, to: 10}];
  const blends = [{a: "a", b: "b", from: 4.6, to: 5.4}];
  assert.deepEqual(overlapAt(shots, blends, 2), {a: "a", alpha: 0});
  assert.deepEqual(overlapAt(shots, blends, 7), {a: "b", alpha: 0});
  const mid = overlapAt(shots, blends, 5);
  assert.equal(mid.a, "a");
  assert.equal(mid.b, "b");
  assert.ok(Math.abs(mid.alpha - 0.5) < 1e-9);
  assert.ok(overlapAt(shots, blends, 4.7).alpha < overlapAt(shots, blends, 5.3).alpha);
});
