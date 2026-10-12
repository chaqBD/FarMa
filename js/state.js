import { CONFIG, BACKGROUNDS } from "./data.js";

const STATS = ["farmingSkill", "businessSense", "energy", "health", "reputation", "network"];

function clampStat(value) {
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
    if (STATS.includes(stat)) stats[stat] = clampStat(stats[stat] + mod);
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
      flags: { ...background.flags },
    },
    finances: {
      cash: background.startingCash,
      startingAsset: background.startingAsset,
    },
    time: { ...CONFIG.startDate },
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

export function saveGame(state) {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
}

export function loadGame() {
  const raw = localStorage.getItem(CONFIG.saveKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
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
