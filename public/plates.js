// plates.js — all of the Plates barbell math, as pure functions.
// Weights are in pounds. Arithmetic goes through half-pound integers so
// 2.5 lb plates never hit float rounding. Keep this file DOM-free: it is
// the porting contract for a future native app.

// Bar weight is configurable (the gym's technique bars live here too).
// Multiples of 5 keep the STEP invariant: every bar + (2 × 2.5) step lands
// on the same 5 lb grid.
export const BAR_OPTIONS = [45, 35, 25, 15];
const DEFAULT_BAR = 45;
let bar = DEFAULT_BAR;

export function getBar() {
  return bar;
}

/** Set the bar weight; unknown weights fall back to the 45 lb default. */
export function setBar(weight) {
  bar = BAR_OPTIONS.includes(weight) ? weight : DEFAULT_BAR;
  return bar;
}

// Plate inventory, largest first. Assumes plenty of each. No 35s.
export const PLATES = [45, 25, 10, 5, 2.5];

// Smallest step onto the bar: one 2.5 lb plate per side = 5 lb total.
export const STEP = 5;

const half = (w) => Math.round(w * 2); // lb -> half-pounds (integer)

/** Can `target` be loaded exactly? Steps of STEP above the bar. */
export function isValid(target) {
  return (
    Number.isFinite(target) &&
    target >= bar &&
    (half(target) - half(bar)) % half(STEP) === 0
  );
}

/** Nearest loadable weight (never below the bar). */
export function snap(target) {
  if (!Number.isFinite(target)) return bar;
  return Math.max(bar, bar + Math.round((target - bar) / STEP) * STEP);
}

/** Greedy fill of `h` half-pounds with the plate set. Exact whenever h is
 *  a multiple of 5 (half-pounds of the 2.5 lb plate), which it always is
 *  for loadable weights. */
function takeHalf(h) {
  const out = [];
  for (const plate of PLATES) {
    const ph = half(plate);
    while (h >= ph) {
      out.push(plate);
      h -= ph;
    }
  }
  return out;
}

/** Greedy fewest-plates load for `perSide` pounds on one sleeve. */
export function platesForPerSide(perSide) {
  return takeHalf(half(perSide));
}

/** Full per-side loadout for a valid total; null for an impossible target. */
export function loadoutPerSide(target) {
  return isValid(target) ? platesForPerSide((target - bar) / 2) : null;
}

/** Total weight of the bar plus `plates` on each side. */
export function totalFor(plates) {
  return bar + 2 * plates.reduce((sum, p) => sum + p, 0);
}

const desc = (a, b) => b - a;

/** Multiset difference: entries of `a` not matched by entries of `b`. */
function minus(a, b) {
  const pool = [...b];
  const out = [];
  for (const x of a) {
    const i = pool.indexOf(x);
    if (i < 0) out.push(x);
    else pool.splice(i, 1);
  }
  return out;
}

/**
 * Plan the swap from the bar's ACTUAL per-side layout `current` to `target`,
 * under one of two strategies:
 *
 * 'clean' (default) — land on the tidy big-plate-first layout the bar would
 * have if you loaded it fresh. 140 -> 145 swaps the 2.5 for a 5, so the bar
 * always matches the picture.
 *
 * 'quick' — handle the fewest plates. Enumerate every subset to pull,
 * greedily refill what must go back, minimize plates touched (ties leave the
 * heavier plates on). 140 -> 145 just slides on a second 2.5.
 *
 * Returns { perSide, removed, added, result } or null for an impossible
 * target: the signed per-side change, what to pull, what to add, and the
 * resulting layout (sorted desc).
 */
export function planSwap(current, target, mode = 'clean') {
  if (!isValid(target)) return null;
  const targetLayout = loadoutPerSide(target);
  const perSide = (target - bar) / 2 - current.reduce((s, p) => s + p, 0);

  if (mode !== 'quick') {
    return {
      perSide,
      removed: minus(current, targetLayout).sort(desc),
      added: minus(targetLayout, current),
      result: [...targetLayout],
    };
  }

  if (perSide === 0) {
    return { perSide: 0, removed: [], added: [], result: [...current].sort(desc) };
  }

  const n = current.length;
  const plateHalf = current.map(half);
  const diffHalf = half(perSide);
  let best = null;
  for (let mask = 0; mask < 1 << n; mask++) {
    let pullHalf = 0;
    let pullCount = 0;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        pullHalf += plateHalf[i];
        pullCount++;
      }
    }
    const addHalf = diffHalf + pullHalf; // refill needed, half-pounds
    if (addHalf < 0) continue;
    const added = takeHalf(addHalf);
    const cost = pullCount + added.length;
    if (!best || cost < best.cost || (cost === best.cost && pullHalf < best.pullHalf)) {
      best = { mask, cost, pullHalf, added };
    }
  }

  const removed = [];
  const kept = [];
  for (let i = 0; i < n; i++) {
    ((best.mask >> i) & 1 ? removed : kept).push(current[i]);
  }
  return {
    perSide,
    removed: removed.sort(desc),
    added: best.added,
    result: [...kept, ...best.added].sort(desc),
  };
}

/** "50" not "50.0"; "57.5". */
export function fmt(weight) {
  return Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(1)));
}
