import { findCrop } from "./data.js";

export const SEED_TIERS = {
  open_market: { label: "Open market seed", cost: 15000, yieldFactor: 0.85 },
  certified: { label: "Certified / improved seed", cost: 35000, yieldFactor: 1.15 },
};

const MIN_READINESS_TO_PLANT = 30;
const MAX_TENDS_PER_CYCLE = 3;
const READINESS_CARRYOVER = 0.4;

export function plantCrop(state, plotIndex, cropId, seedTierId) {
  const plot = state.land[plotIndex];
  const crop = findCrop(cropId);
  const seedTier = SEED_TIERS[seedTierId];
  if (!plot) return { ok: false, message: "No such plot." };
  if (plot.crop) return { ok: false, message: "This plot already has a crop growing." };
  if (!crop) return { ok: false, message: "No such crop." };
  if (!seedTier) return { ok: false, message: "No such seed option." };
  if (plot.readiness < MIN_READINESS_TO_PLANT) {
    return { ok: false, message: "This plot isn't ready — prepare it first." };
  }
  if (state.finances.cash < seedTier.cost) {
    return { ok: false, message: `Not enough cash for ${seedTier.label}.` };
  }

  state.finances.cash -= seedTier.cost;
  plot.crop = { cropId, seedTierId, daysGrown: 0, care: 0, tendCount: 0 };

  const message = `Planted ${crop.name} on Plot ${plotIndex + 1} (${seedTier.label}).`;
  state.log.push(message);
  return { ok: true, message };
}

export function tendPlot(state, plotIndex) {
  const plot = state.land[plotIndex];
  if (!plot || !plot.crop) return { ok: false, message: "Nothing is growing on this plot." };
  if (isMature(plot)) return { ok: false, message: "This crop is ready to harvest, not tend." };
  if (plot.crop.tendCount >= MAX_TENDS_PER_CYCLE) {
    return { ok: false, message: "No more tending helps this crop this cycle." };
  }
  const ENERGY_COST = 10;
  const CASH_COST = 2000;
  if (state.player.stats.energy < ENERGY_COST) return { ok: false, message: "Too tired — rest first." };
  if (state.finances.cash < CASH_COST) return { ok: false, message: "Not enough cash to tend this plot." };

  state.finances.cash -= CASH_COST;
  state.player.stats.energy -= ENERGY_COST;
  plot.crop.care = Math.min(100, plot.crop.care + 20);
  plot.crop.tendCount += 1;

  const message = `Weeded and watered Plot ${plotIndex + 1}.`;
  state.log.push(message);
  return { ok: true, message };
}

export function isMature(plot) {
  if (!plot.crop) return false;
  const crop = findCrop(plot.crop.cropId);
  return plot.crop.daysGrown >= crop.cycleDays;
}

/** Advances growth on every planted plot by one day. Called once per game day. */
export function growPlots(state) {
  for (const plot of state.land) {
    if (plot.crop) plot.crop.daysGrown += 1;
  }
}

export function harvestPlot(state, plotIndex) {
  const plot = state.land[plotIndex];
  if (!plot || !plot.crop) return { ok: false, message: "Nothing to harvest here." };
  if (!isMature(plot)) return { ok: false, message: "Not ready yet." };

  const crop = findCrop(plot.crop.cropId);
  const seedTier = SEED_TIERS[plot.crop.seedTierId];
  const soilFactor = crop.soilFit[plot.soil] ?? 0.6;
  const readinessFactor = 0.4 + 0.6 * (plot.readiness / 100);
  const careFactor = 0.8 + 0.4 * (plot.crop.care / 100);
  const skillFactor = 0.7 + 0.6 * (state.player.stats.farmingSkill / 100);
  const backgroundFactor = 1 + (state.player.flags.yieldBonus || 0) - (state.player.flags.yieldPenalty || 0);

  const yieldKg = Math.round(
    crop.baseYieldKg * soilFactor * readinessFactor * seedTier.yieldFactor * careFactor * skillFactor * backgroundFactor
  );

  state.inventory[crop.id] = (state.inventory[crop.id] || 0) + yieldKg;
  state.player.stats.farmingSkill = Math.min(100, state.player.stats.farmingSkill + 1);

  plot.readiness = Math.round(plot.readiness * READINESS_CARRYOVER);
  plot.crop = null;

  const estimatedValue = Math.round(yieldKg * crop.basePricePerKg);
  const message = `Harvested ${yieldKg} kg of ${crop.name} from Plot ${plotIndex + 1} (worth roughly ₦${estimatedValue.toLocaleString()} at market).`;
  state.log.push(message);
  return { ok: true, message, yieldKg };
}
