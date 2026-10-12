import { CONFIG, EVENTS } from "./data.js";
import { dayIndex, clampStat, pushLog } from "./state.js";
import { recordTransaction } from "./finance.js";
import { isMature } from "./crops.js";

// No event can fire in the player's first couple of weeks, so a new game
// always has a short stretch to get land and a first crop going before
// anything can go wrong. dayIndex() counts from the calendar epoch, not
// from the game's start date (which is day-of-year ~91), so the grace
// period is measured relative to CONFIG.startDate, not to zero.
const GRACE_PERIOD_DAYS = 14;
const DAILY_EVENT_CHANCE = 0.12;

function daysSinceStart(time) {
  return dayIndex(time) - dayIndex(CONFIG.startDate);
}

const REQUIREMENT_CHECKS = {
  always: () => true,
  anyLand: (state) => state.land.length > 0,
  // A mature, unharvested crop is no longer "at risk" the way a growing
  // one is — weather/pest events resolve by nudging a growing plot's
  // care (see randomGrowingPlotCareDelta below), which only ever
  // targets non-mature plots, so this requirement matches that.
  landWithCrop: (state) => state.land.some((plot) => plot.crop && !isMature(plot)),
  inventory: (state) => Object.values(state.inventory).some((kg) => kg > 0),
};

function eventApplies(event, state) {
  const check = REQUIREMENT_CHECKS[event.requires] || REQUIREMENT_CHECKS.always;
  return check(state);
}

function weightedPick(candidates) {
  const totalWeight = candidates.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    if (roll < candidate.weight) return candidate;
    roll -= candidate.weight;
  }
  return candidates[candidates.length - 1];
}

/** Called once per day-advance. Returns an event to show the player, or null. */
export function maybeTriggerEvent(state) {
  if (daysSinceStart(state.time) < GRACE_PERIOD_DAYS) return null;
  if (Math.random() > DAILY_EVENT_CHANCE) return null;

  const candidates = EVENTS.filter((event) => eventApplies(event, state));
  if (candidates.length === 0) return null;
  return weightedPick(candidates);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function resolveEventChoice(state, event, choiceIndex) {
  const choice = event.choices[choiceIndex];
  if (!choice) return { ok: false, message: "No such choice." };
  const effect = choice.effect || {};

  if (effect.cashDelta) {
    state.finances.cash += effect.cashDelta;
    recordTransaction(state, { type: "event", amount: effect.cashDelta, note: event.title });
  }
  if (effect.energyDelta) {
    state.player.stats.energy = clampStat(state.player.stats.energy + effect.energyDelta);
  }
  if (effect.healthDelta) {
    state.player.stats.health = clampStat(state.player.stats.health + effect.healthDelta);
  }
  if (effect.reputationDelta) {
    state.player.stats.reputation = clampStat(state.player.stats.reputation + effect.reputationDelta);
  }
  if (effect.networkDelta) {
    state.player.stats.network = clampStat(state.player.stats.network + effect.networkDelta);
  }
  if (effect.farmingSkillDelta) {
    state.player.stats.farmingSkill = clampStat(state.player.stats.farmingSkill + effect.farmingSkillDelta);
  }
  if (effect.businessSenseDelta) {
    state.player.stats.businessSense = clampStat(state.player.stats.businessSense + effect.businessSenseDelta);
  }
  if (effect.randomGrowingPlotCareDelta) {
    const growing = state.land.filter((plot) => plot.crop && !isMature(plot));
    if (growing.length > 0) {
      const target = pickRandom(growing);
      target.crop.care = clampStat(target.crop.care + effect.randomGrowingPlotCareDelta);
    }
  }
  if (effect.randomPlotReadinessDelta && state.land.length > 0) {
    const target = pickRandom(state.land);
    target.readiness = clampStat(target.readiness + effect.randomPlotReadinessDelta);
  }
  if (effect.inventoryLossPercent) {
    const cropIds = Object.keys(state.inventory).filter((id) => state.inventory[id] > 0);
    if (cropIds.length > 0) {
      const id = pickRandom(cropIds);
      const loss = Math.round((state.inventory[id] * effect.inventoryLossPercent) / 100);
      state.inventory[id] = Math.max(0, state.inventory[id] - loss);
      if (state.inventory[id] === 0) delete state.inventory[id];
    }
  }

  const message = `${event.title}: ${choice.resultText}`;
  pushLog(state, message);
  return { ok: true, message };
}
