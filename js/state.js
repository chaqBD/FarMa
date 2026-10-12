import { CONFIG, BACKGROUNDS } from "./data.js";

export const STAT_LABELS = {
  farmingSkill: "Farming Skill",
  businessSense: "Business Sense",
  energy: "Energy",
  health: "Health",
  reputation: "Reputation",
  network: "Network",
};

export function clampStat(value) {
  return Math.max(CONFIG.statRange.min, Math.min(CONFIG.statRange.max, value));
}

export function findBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id);
}

export function newGameState({ name, gender, homeState, farmName, backgroundId }) {
  const background = findBackground(backgroundId);
  if (!background) throw new Error(`Unknown background: ${backgroundId}`);

  const stats = { ...CONFIG.baseStats };
  for (const [stat, mod] of Object.entries(background.statMods || {})) {
    if (stat in stats) stats[stat] = clampStat(stats[stat] + mod);
  }

  return {
    version: 1,
    player: {
      name,
      gender,
      homeState,
      farmName,
      backgroundId,
      stats,
      // The post-background resting point each stat drifts back toward
      // on quiet days, so a background's permanent modifier (e.g. a lower
      // energy cap) never gets erased by day-to-day recovery.
      restingStats: { ...stats },
      flags: { ...background.flags },
    },
    finances: {
      cash: background.startingCash,
      startingAsset: background.startingAsset,
      lifetimeIncome: 0,
      lifetimeExpense: 0,
    },
    time: { ...CONFIG.startDate },
    land: [],
    inventory: {},
    financeLog: [],
    log: [
      `${farmName} is founded by ${name} in ${homeState}. ${background.perk}.`,
    ],
  };
}

export function seasonForMonth(month) {
  return CONFIG.raintySeasonMonths.includes(month) ? "rainy" : "dry";
}

export function monthName(month) {
  const names = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return names[month - 1];
}

/** A strictly increasing day count from the start of the game, used to seed market price drift. */
export function dayIndex(time) {
  return (time.year - 1) * CONFIG.daysPerMonth * CONFIG.monthsPerYear + (time.month - 1) * CONFIG.daysPerMonth + time.day;
}

export function saveGame(state) {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
}

/**
 * Backfills fields that didn't exist in older save versions, so a save
 * made before a schema addition (e.g. `land`/`inventory`) still loads
 * instead of crashing the first screen that reads the missing field.
 */
function withDefaults(state) {
  if (!state.land) state.land = [];
  if (!state.inventory) state.inventory = {};
  if (!state.financeLog) state.financeLog = [];
  if (state.finances.lifetimeIncome === undefined) state.finances.lifetimeIncome = 0;
  if (state.finances.lifetimeExpense === undefined) state.finances.lifetimeExpense = 0;
  return state;
}

export function loadGame() {
  const raw = localStorage.getItem(CONFIG.saveKey);
  if (!raw) return null;
  try {
    return withDefaults(JSON.parse(raw));
  } catch (err) {
    console.error("Corrupt save data", err);
    return null;
  }
}

export function hasSave() {
  return localStorage.getItem(CONFIG.saveKey) !== null;
}

export function clearSave() {
  localStorage.removeItem(CONFIG.saveKey);
}
