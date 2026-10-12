import { CONFIG } from "./data.js";
import { seasonForMonth, monthName } from "./state.js";
import { growPlots } from "./crops.js";

/**
 * Advances the game clock by one day, mutating state in place. Returns a
 * short log line. Does not save — callers that also append to state.log
 * should do both, then save once, so the log entry for the new day is
 * never dropped from the persisted save.
 */
export function advanceDay(state) {
  state.time.day += 1;
  if (state.time.day > CONFIG.daysPerMonth) {
    state.time.day = 1;
    state.time.month += 1;
    if (state.time.month > CONFIG.monthsPerYear) {
      state.time.month = 1;
      state.time.year += 1;
    }
  }

  // Energy and health drift gently toward the player's own resting point
  // each day of rest — not the global baseline, so a background's
  // permanent stat modifier (e.g. a lower energy cap) persists.
  const resting = state.player.restingStats;
  state.player.stats.energy = drift(state.player.stats.energy, resting.energy, 2);
  state.player.stats.health = drift(state.player.stats.health, resting.health, 1);

  growPlots(state);

  return describeDate(state.time);
}

function drift(value, target, step) {
  if (value < target) return Math.min(target, value + step);
  if (value > target) return Math.max(target, value - step);
  return value;
}

export function describeDate(time) {
  const season = seasonForMonth(time.month);
  const seasonLabel = season === "rainy" ? "Rainy season" : "Dry season (harmattan)";
  return `${monthName(time.month)} ${time.day}, Year ${time.year} — ${seasonLabel}`;
}
