// plates.js — all of the Plates barbell math, as pure functions.
// Weights are in pounds. Arithmetic goes through half-pound integers so
// 2.5 lb plates never hit float rounding. Keep this file DOM-free: it is
// the porting contract for a future native app.

export const BAR = 45;

// Plate inventory, largest first. Assumes plenty of each. No 35s.
export const PLATES = [45, 25, 10, 5, 2.5];

// Smallest step onto the bar: one 2.5 lb plate per side = 5 lb total.
export const STEP = 5;

const half = (w) => Math.round(w * 2); // lb -> half-pounds (integer)

/** Can `target` be loaded exactly? Steps of STEP above the bar. */
export function isValid(target) {
  return (
    Number.isFinite(target) &&
    target >= BAR &&
    (half(target) - half(BAR)) % half(STEP) === 0
  );
}

/** Nearest loadable weight (never below the bar). */
export function snap(target) {
  if (!Number.isFinite(target)) return BAR;
  return Math.max(BAR, BAR + Math.round((target - BAR) / STEP) * STEP);
}

/** Greedy fill of `h` half-pounds with the plate set. */
function takeHalf(h) {
  const out = [];
  for (const plate of PLATES) {
    const ph = half(plate);
    while (h >= ph) {
      out.push(plate);
      h -= ph;
    }
  }
  return out; // h hits 0 for any non-negative integer (smallest plate = 1 half... see note)
  // Note: smallest plate is 2.5 lb = 5 half-pounds, so this is exact whenever
  // h is a multiple of 5 — which it always is for valid weights.
}

/** Greedy fewest-plates load for `perSide` pounds on one sleeve. */
export function platesForPerSide(perSide) {
  return takeHalf(half(perSide));
}

/** Full per-side loadout for a valid total; null for an impossible target. */
export function loadoutPerSide(target) {
  return isValid(target) ? platesForPerSide((target - BAR) / 2) : null;
}

/** Total weight of the bar plus `plates` on each side. */
export function totalFor(plates) {
  return BAR + 2 * plates.reduce((sum, p) => sum + p, 0);
}

const desc = (a, b) => b - a;

/**
 * Plan the swap from the bar's ACTUAL per-side layout `current` to `target`.
 *
 * Weight-only deltas lie at the bar: going 185 -> 180 means "remove 2.5 per
 * side", but a [45, 25] bar has no 2.5 to remove. So we enumerate which
 * plates to pull off (all subsets of what's on the bar) and greedily fill
 * whatever must be added back, minimizing total plates handled — then ties
 * go to touching fewer of the plates already on.
 *
 * Returns { perSide, removed, added, result }: the signed per-side change,
 * what to pull, what to slide on, and the resulting layout (sorted desc).
 */
export function planSwap(current, target) {
  if (!isValid(target)) return null;
  const curHalf = current.reduce((s, p) => s + half(p), 0);
  const diffHalf = half((target - BAR) / 2) - curHalf; // signed, per side
  if (diffHalf === 0) {
    return { perSide: 0, removed: [], added: [], result: [...current].sort(desc) };
  }

  const n = current.length;
  const plateHalf = current.map(half);
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
    const addHalf = diffHalf + pullHalf; // must be >= 0
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
    perSide: diffHalf / 2,
    removed: removed.sort(desc),
    added: best.added,
    result: [...kept, ...best.added].sort(desc),
  };
}

/** "50" not "50.0"; "57.5". */
export function fmt(weight) {
  return Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(1)));
}
