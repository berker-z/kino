// timeDriver is the clock every canvas piece runs on. HyperFrames seeks the
// paused master timeline to arbitrary times with callbacks suppressed; these
// tests do the same with a real GSAP timeline and check that the painter
// sees exactly the frame that was asked for, whatever the order.

import {test} from "node:test";
import assert from "node:assert/strict";
import {gsap} from "gsap";
import {timeDriver} from "../src/runtime/time-driver";

type Call = {t: number; frame: number};

function setup({fps = 30, duration = 4, start = 0} = {}) {
  const tl = gsap.timeline({paused: true});
  const calls: Call[] = [];
  timeDriver(tl, {start, duration, fps}, (t, frame) => calls.push({t, frame}));
  // HyperFrames seeks with events suppressed.
  const seek = (time: number) => tl.seek(time, true);
  return {tl, calls, seek};
}

test("setup paints frame 0 exactly once, and a seek to 0 doesn't paint it again", () => {
  const {calls, seek} = setup();
  assert.deepEqual(calls, [{t: 0, frame: 0}]);
  seek(0);
  assert.equal(calls.length, 1, "frame 0 was painted twice");
});

for (const fps of [30, 60]) {
  test(`every frame lands exactly at ${fps} fps, seeking in order`, () => {
    const {calls, seek} = setup({fps, duration: 3});
    calls.length = 0;
    for (let f = 1; f <= 3 * fps - 1; f++) {
      seek(f / fps);
      const last = calls.at(-1)!;
      assert.equal(last.frame, f, `seek to frame ${f} painted ${last.frame}`);
      assert.equal(last.t, f / fps);
    }
    assert.equal(calls.length, 3 * fps - 1, "a seek painted zero or several frames");
  });
}

test("out-of-order seeks paint the frame asked for, independent of history", () => {
  const order = [0, 50, 3, 3, 89, 1, 50, 0, 44, 45, 44];
  const {calls, seek} = setup({fps: 30, duration: 3});
  for (const f of order) seek(f / 30);
  // Consecutive duplicate seeks don't repaint; every other seek paints exactly its frame.
  const expected = order.filter((f, i) => i === 0 ? f !== 0 : f !== order[i - 1]);
  assert.deepEqual(calls.slice(1).map((c) => c.frame), expected);
});

test("seeks on exact frame boundaries round to that frame, not the one before", () => {
  const {calls, seek} = setup({fps: 30, duration: 10});
  // Times that are classic float traps: 0.1 * 3, 1/3, 0.7, 2.3.
  for (const [time, frame] of [[0.1 * 3, 9], [1 / 3, 10], [0.7, 21], [2.3, 69], [9.9, 297]] as const) {
    seek(time);
    assert.equal(calls.at(-1)!.frame, frame, `t=${time}`);
  }
});

test("nonzero start: local time counts from start; before start holds frame 0", () => {
  const {calls, seek} = setup({fps: 30, duration: 2, start: 5});
  seek(6);
  assert.deepEqual(calls.at(-1), {t: 1, frame: 30});
  seek(5.5);
  assert.deepEqual(calls.at(-1), {t: 0.5, frame: 15});
  seek(1);
  assert.deepEqual(calls.at(-1), {t: 0, frame: 0});
});

test("seeking past the end holds the last time, never runs past duration", () => {
  const {calls, seek} = setup({fps: 30, duration: 2});
  seek(100);
  const last = calls.at(-1)!;
  assert.ok(last.t <= 2, `painted t=${last.t} past the end`);
});

test("several drivers on one timeline each paint their own frames", () => {
  const tl = gsap.timeline({paused: true});
  const a: number[] = [];
  const b: number[] = [];
  timeDriver(tl, {duration: 2, fps: 30}, (_t, f) => a.push(f));
  timeDriver(tl, {start: 1, duration: 2, fps: 60}, (_t, f) => b.push(f));
  tl.seek(1.5, true);
  assert.equal(a.at(-1), 45);
  assert.equal(b.at(-1), 30);
  tl.seek(0.25, true);
  assert.equal(a.at(-1), 8); // 7.5 rounds up
  assert.equal(b.at(-1), 0); // before its start: held at frame 0
});
