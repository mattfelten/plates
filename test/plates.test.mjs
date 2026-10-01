import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR, PLATES, STEP,
  isValid, snap, platesForPerSide, loadoutPerSide, totalFor, delta, fmt,
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
  assert.deepEqual(loadoutPerSide(160), [45, 10, 2.5]); // the 135→160 set
  assert.deepEqual(loadoutPerSide(205), [45, 25, 10]);
  assert.deepEqual(loadoutPerSide(225), [45, 45]);
  assert.equal(loadoutPerSide(143), null);
});

test('delta — add / remove per side', () => {
  let d = delta(135, 160);
  assert.deepEqual(d.added, [10, 2.5]); // the 135→160 confusion, resolved
  assert.deepEqual(d.removed, []);
  assert.equal(d.perSide, 12.5);

  d = delta(160, 135);
  assert.deepEqual(d.removed, [10, 2.5]);
  assert.deepEqual(d.added, []);
  assert.equal(d.perSide, -12.5);

  d = delta(140, 145); // the 140→145 that became a 155 mistake
  assert.deepEqual(d.added, [2.5]);

  assert.deepEqual(delta(145, 145), { perSide: 0, added: [], removed: [] });
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
