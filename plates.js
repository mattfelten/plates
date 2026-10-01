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

/** Greedy fewest-plates load for `perSide` pounds on one sleeve. */
export function platesForPerSide(perSide) {
  let rest = half(perSide);
  const out = [];
  for (const plate of PLATES) {
    const ph = half(plate);
    while (rest >= ph) {
      out.push(plate);
      rest -= ph;
    }
  }
  return out; // rest hits 0 for any multiple of 2.5
}

/** Full per-side loadout for a valid total; null for an impossible target. */
export function loadoutPerSide(target) {
  return isValid(target) ? platesForPerSide((target - BAR) / 2) : null;
}

/** Total weight of the bar plus `plates` on each side. */
export function totalFor(plates) {
  return BAR + 2 * plates.reduce((sum, p) => sum + p, 0);
}

/**
 * The move from `current` to `target` — weight-based, not layout-based.
 * Even when the physical bar is stacked with smaller plates than the greedy
 * layout would use, "add 2.5 per side" is still the right instruction.
 */
export function delta(current, target) {
  const perSide = (target - current) / 2;
  const plates = perSide === 0 ? [] : platesForPerSide(Math.abs(perSide));
  return {
    perSide,
    added: perSide > 0 ? plates : [],
    removed: perSide < 0 ? plates : [],
  };
}

/** "50" not "50.0"; "57.5". */
export function fmt(weight) {
  return Number.isInteger(weight) ? String(weight) : String(Number(weight.toFixed(1)));
}
