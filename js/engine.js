import { CONFIG } from "./data.js";
import { seasonForMonth, monthName, saveGame } from "./state.js";

/** Advances the game clock by one day, mutating state in place. Returns a short log line. */
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

  // Energy and health drift gently toward their baseline each day of rest.
  const baseline = CONFIG.baseStats;
  state.player.stats.energy = drift(state.player.stats.energy, baseline.energy, 2);
  state.player.stats.health = drift(state.player.stats.health, baseline.health, 1);

  saveGame(state);
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
