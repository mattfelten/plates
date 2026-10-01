import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBar, setBar, PLATES, STEP,
  isValid, snap, platesForPerSide, loadoutPerSide, totalFor, planSwap, fmt,
} from '../public/plates.js';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

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

test('clean plan — lands on the big-plate-first layout (185 to 180)', () => {
  // [45, 25] per side, want 180 (67.5 per side): a [45, 25] bar has no 2.5
  // to remove, so the move is pull the 25, add 10 + 10 + 2.5.
  const p = planSwap([45, 25], 180);
  assert.deepEqual(p.removed, [25]);
  assert.deepEqual(p.added, [10, 10, 2.5]);
  assert.deepEqual(p.result, [45, 10, 10, 2.5]);
  assert.equal(totalFor(p.result), 180);
});

test('clean vs quick — 140 to 145', () => {
  const clean = planSwap([45, 2.5], 145, 'clean');
  assert.deepEqual(clean.removed, [2.5]);
  assert.deepEqual(clean.added, [5]); // tidy bar: one plate per size
  assert.deepEqual(clean.result, [45, 5]);

  const quick = planSwap([45, 2.5], 145, 'quick');
  assert.deepEqual(quick.removed, []);
  assert.deepEqual(quick.added, [2.5]); // fewest plates handled: one slide
  assert.deepEqual(quick.result, [45, 2.5, 2.5]);
});

test('clean and quick agree when the swap is already minimal', () => {
  for (const [layout, target] of [[[45], 160], [[45, 25], 180], [[45, 5], 140], [[], 50]]) {
    const clean = planSwap(layout, target, 'clean');
    const quick = planSwap(layout, target, 'quick');
    assert.deepEqual(clean.removed, quick.removed, `${layout} -> ${target} removed`);
    assert.deepEqual(clean.added, quick.added, `${layout} -> ${target} added`);
  }
});

test('quick plan — plain adds beat swaps', () => {
  let p = planSwap([45], 160, 'quick'); // 135 -> 160
  assert.deepEqual(p.removed, []);
  assert.deepEqual(p.added, [10, 2.5]);

  p = planSwap([], 50, 'quick'); // empty bar -> 50
  assert.deepEqual(p.added, [2.5]);

  p = planSwap([45, 5], 140, 'quick'); // 145 -> 140
  assert.deepEqual(p.removed, [5]);
  assert.deepEqual(p.added, [2.5]);
  assert.equal(totalFor(p.result), 140);

  p = planSwap([45], 130, 'quick'); // 135 -> 130: only a 45 to pull
  assert.deepEqual(p.removed, [45]);
  assert.equal(totalFor(p.result), 130);
});

test('clean plan — tidies an on-target bar; quick says relax', () => {
  const clean = planSwap([45, 2.5, 2.5], 145, 'clean');
  assert.equal(clean.perSide, 0);
  assert.deepEqual(clean.removed, [2.5, 2.5]);
  assert.deepEqual(clean.added, [5]);

  const quick = planSwap([45, 2.5, 2.5], 145, 'quick');
  assert.deepEqual(quick.removed, []);
  assert.deepEqual(quick.added, []);
});

test('no-op and invalid targets', () => {
  assert.deepEqual(planSwap([45, 10, 2.5], 160), {
    perSide: 0, removed: [], added: [], result: [45, 10, 2.5],
  });
  assert.equal(planSwap([45], 143), null);
  assert.equal(planSwap([45], 143, 'quick'), null);
});

test('every valid weight up to 1000 round-trips exactly', () => {
  for (let t = getBar(); t <= 1000; t += STEP) {
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

test('plan walk — both modes hit the target, move only real plates', () => {
  const sequence = [135, 160, 140, 205, 180, 155, 45, 95, 225, 160, 145, 145, 175];
  for (const mode of ['clean', 'quick']) {
    let layout = [];
    for (const t of sequence) {
      const p = planSwap(layout, t, mode);
      assert.ok(p, `bad target ${t}`);
      assert.equal(totalFor(p.result), t, `${mode} walk failed at ${t}`);
      assert.equal(sum(p.added) - sum(p.removed), p.perSide, `${mode} perSide mismatch at ${t}`);
      const pool = [...layout];
      for (const removed of p.removed) {
        const i = pool.indexOf(removed);
        assert.ok(i >= 0, `${mode}: can't remove absent plate ${removed} at ${t}`);
        pool.splice(i, 1);
      }
      layout = p.result;
    }
  }
});

test('configurable bar weight', (t) => {
  t.after(() => setBar(45));
  setBar(35);
  assert.equal(getBar(), 35);
  assert.equal(totalFor([]), 35); // bare 35 bar
  assert.equal(isValid(40), true); // bar + one 2.5 per side
  assert.deepEqual(loadoutPerSide(105), [25, 10]); // (105 - 35) / 2 = 35

  const p = planSwap([], 105);
  assert.deepEqual(p.added, [25, 10]);

  const back = planSwap([25, 10], 35); // strip to bare bar
  assert.deepEqual(back.removed, [25, 10]);
  assert.deepEqual(back.added, []);

  setBar(45);
  assert.equal(isValid(40), false); // 40 was only loadable on the 35 bar
});

test('setBar rejects unknown weights', () => {
  assert.equal(setBar(38), 45);
  assert.equal(setBar(10), 45);
  assert.equal(getBar(), 45);
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
