import { findLandOption } from "./data.js";
import { recordTransaction } from "./finance.js";

export const SOIL_LABELS = {
  loamy: "Loamy",
  sandy: "Sandy",
  clay: "Clay",
  fadama: "Swampy / fadama",
};

export const PREP_TIERS = {
  basic: { label: "Basic clearing", cost: 0, energyCost: 10, readinessGain: 35 },
  thorough: { label: "Thorough prep (clear, test, till)", cost: 15000, energyCost: 20, readinessGain: 75 },
};

function randomSoil(soils) {
  return soils[Math.floor(Math.random() * soils.length)];
}

function newPlot(soil) {
  return { soil, readiness: 0, crop: null };
}

/** Leases a land package, adding its plots to state.land. Returns {ok, message}. */
export function leaseLand(state, landOptionId) {
  const option = findLandOption(landOptionId);
  if (!option) return { ok: false, message: "That land package doesn't exist." };
  if (state.finances.cash < option.leaseCost) {
    return { ok: false, message: `You need ${option.leaseCost.toLocaleString()} to lease the ${option.label}.` };
  }

  state.finances.cash -= option.leaseCost;
  recordTransaction(state, { type: "land_lease", amount: -option.leaseCost, note: `Leased ${option.label}` });
  for (let i = 0; i < option.plots; i++) {
    state.land.push(newPlot(randomSoil(option.soils)));
  }
  const message = `Leased the ${option.label} (${option.plots} plot${option.plots > 1 ? "s" : ""}).`;
  state.log.push(message);
  return { ok: true, message };
}

/** Prepares a plot for planting. tierId is "basic" or "thorough". */
export function preparePlot(state, plotIndex, tierId) {
  const plot = state.land[plotIndex];
  const tier = PREP_TIERS[tierId];
  if (!plot) return { ok: false, message: "No such plot." };
  if (!tier) return { ok: false, message: "No such preparation option." };
  if (plot.crop) return { ok: false, message: "Harvest this plot before re-preparing it." };
  if (state.finances.cash < tier.cost) return { ok: false, message: "Not enough cash for that." };
  if (state.player.stats.energy < tier.energyCost) return { ok: false, message: "Too tired — rest first." };

  state.finances.cash -= tier.cost;
  if (tier.cost > 0) {
    recordTransaction(state, { type: "land_prep", amount: -tier.cost, note: `${tier.label} on Plot ${plotIndex + 1}` });
  }
  state.player.stats.energy -= tier.energyCost;
  plot.readiness = Math.min(100, plot.readiness + tier.readinessGain);

  const message = `${tier.label} done on Plot ${plotIndex + 1} — Readiness now ${plot.readiness}.`;
  state.log.push(message);
  return { ok: true, message };
}
