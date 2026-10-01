import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR, PLATES, STEP,
  isValid, snap, platesForPerSide, loadoutPerSide, totalFor, planSwap, fmt,
} from '../plates.js';

test('valid weights are steps of 5 at or above the bar', () => {
  for (const t of [45, 50, 135, 140, 145, 160, 225, 500]) {
    assert.equal(isValid(t), true, `expected valid: ${t}`);
  }
  for (const t of [40, 43, 47.5, 137.5, 51, 0, -45, NaN, Infinity]) {
    assert.equal(isValid(t), false, `expected invalid: ${t}`);
  }
});

test('loadouts — the real-world cases', () => {
  assert.deepEqual(loadoutPerSide(45), []);
  assert.deepEqual(loadoutPerSide(135), [45]);
  assert.deepEqual(loadoutPerSide(140), [45, 2.5]);
  assert.deepEqual(loadoutPerSide(145), [45, 5]);
  assert.deepEqual(loadoutPerSide(155), [45, 10]);
  assert.deepEqual(loadoutPerSide(160), [45, 10, 2.5]);
  assert.deepEqual(loadoutPerSide(205), [45, 25, 10]);
  assert.deepEqual(loadoutPerSide(225), [45, 45]);
  assert.equal(loadoutPerSide(143), null);
});

test('planSwap — the 185 to 180 coffee test', () => {
  // [45, 25] per side, want 180 (67.5 per side): no 2.5 exists on the bar
  // to remove, so the right move is pull the 25, add 10 + 10 + 2.5.
  const p = planSwap([45, 25], 180);
  assert.deepEqual(p.removed, [25]);
  assert.deepEqual(p.added, [10, 10, 2.5]);
  assert.deepEqual(p.result, [45, 10, 10, 2.5]);
  assert.equal(totalFor(p.result), 180);
});

test('planSwap — plain adds beat swaps', () => {
  let p = planSwap([45], 160); // 135 -> 160
  assert.deepEqual(p.removed, []);
  assert.deepEqual(p.added, [10, 2.5]);

  p = planSwap([45, 2.5], 145); // 140 -> 145: slide on another 2.5 (1 move),
  assert.deepEqual(p.removed, []); // NOT swap 2.5 -> 5 (2 moves)
  assert.deepEqual(p.added, [2.5]);

  p = planSwap([], 50); // empty bar -> 50
  assert.deepEqual(p.added, [2.5]);
});

test('planSwap — plain removals when the plate exists', () => {
  const p = planSwap([45, 5], 140); // 145 -> 140
  assert.deepEqual(p.removed, [5]);
  assert.deepEqual(p.added, [2.5]); // 5 pulled, 2.5 back = net -2.5, 2 moves
  assert.equal(totalFor(p.result), 140);
});

test('planSwap — full pull when nothing smaller works', () => {
  const p = planSwap([45], 130); // 135 -> 130: only a 45 to pull
  assert.deepEqual(p.removed, [45]);
  assert.equal(totalFor(p.result), 130);
});

test('planSwap — no-op when already there', () => {
  const p = planSwap([45, 10, 2.5], 160);
  assert.deepEqual(p, { perSide: 0, removed: [], added: [], result: [45, 10, 2.5] });
  assert.equal(planSwap([45], 143), null);
});

test('every valid weight up to 1000 round-trips exactly', () => {
  for (let t = BAR; t <= 1000; t += STEP) {
    const loadout = loadoutPerSide(t);
    assert.ok(loadout, `unexpectedly invalid: ${t}`);
    assert.equal(totalFor(loadout), t, `round-trip failed at ${t}`);
    for (const p of loadout) assert.ok(PLATES.includes(p), `bogus plate ${p}`);
  }
});

test('greedy load never uses more plates than necessary', () => {
  const halves = PLATES.map((p) => Math.round(p * 2));
  for (let ps2 = 5; ps2 <= 500; ps2 += 5) { // per-side half-pounds, multiples of 2.5
    const ps = ps2 / 2;
    const dp = new Array(ps2 + 1).fill(Infinity);
    dp[0] = 0;
    for (let i = 1; i <= ps2; i++) {
      for (const ph of halves) {
        if (i >= ph) dp[i] = Math.min(dp[i], dp[i - ph] + 1);
      }
    }
    assert.equal(
      platesForPerSide(ps).length, dp[ps2],
      `greedy not minimal at ${ps} per side`
    );
  }
});

test('planSwap walk — result always hits the target and stays consistent', () => {
  const sequence = [135, 160, 140, 205, 180, 155, 45, 95, 225, 160, 160, 175];
  let layout = [];
  for (const t of sequence) {
    const p = planSwap(layout, t);
    assert.ok(p, `bad target ${t}`);
    assert.equal(totalFor(p.result), t, `walk failed at ${t}`);
    const sum = (xs) => xs.reduce((a, b) => a + b, 0);
    assert.equal(sum(p.added) - sum(p.removed), p.perSide, `perSide mismatch at ${t}`);
    for (const removed of p.removed) {
      assert.ok(layout.includes(removed), `can't remove absent plate ${removed}`);
    }
    layout = p.result;
  }
});

test('snap finds the nearest loadable weight', () => {
  assert.equal(snap(143), 145);
  assert.equal(snap(142), 140);
  assert.equal(snap(145), 145);
  assert.equal(snap(20), 45);
  assert.equal(snap(NaN), 45);
});

test('fmt trims trailing zeros', () => {
  assert.equal(fmt(50), '50');
  assert.equal(fmt(57.5), '57.5');
  assert.equal(fmt(2.5), '2.5');
});
