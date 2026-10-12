import { findCrop, findMarket } from "./data.js";
import { dayIndex, pushLog } from "./state.js";
import { recordTransaction } from "./finance.js";

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 10000;
  return hash;
}

/** Deterministic day-to-day price drift (±15%), stable per crop+market pair so prices don't jitter randomly on every render. */
export function priceFor(state, cropId, marketId) {
  const crop = findCrop(cropId);
  const market = findMarket(marketId);
  if (!crop || !market) return 0;

  const seed = hashString(cropId + marketId);
  const wave = Math.sin((dayIndex(state.time) + seed) * 0.21) * 0.15;
  const multiplier = 1 + wave;
  return crop.basePricePerKg * market.priceMultiplier * multiplier;
}

export function sellCrop(state, cropId, marketId, kg) {
  const crop = findCrop(cropId);
  const market = findMarket(marketId);
  if (!crop || !market) return { ok: false, message: "That crop or market doesn't exist." };

  const kgQty = Math.floor(Number(kg));
  if (!(kgQty > 0)) return { ok: false, message: "Enter a quantity to sell." };

  const available = state.inventory[cropId] || 0;
  if (kgQty > available) return { ok: false, message: `You only have ${available} kg of ${crop.name}.` };
  if (market.volumeCap && kgQty > market.volumeCap) {
    return { ok: false, message: `${market.label} only buys up to ${market.volumeCap} kg per visit.` };
  }

  const unitPrice = priceFor(state, cropId, marketId);
  const grossRevenue = unitPrice * kgQty;
  const transportCost = market.transportCostPerKg * kgQty;
  const netRevenue = Math.round(grossRevenue - transportCost);

  if (netRevenue <= 0) {
    return { ok: false, message: "Transport costs would wipe out the sale — try a closer market." };
  }

  state.inventory[cropId] = available - kgQty;
  if (state.inventory[cropId] === 0) delete state.inventory[cropId];

  state.finances.cash += netRevenue;
  recordTransaction(state, {
    type: "sale",
    amount: netRevenue,
    note: `Sold ${kgQty} kg ${crop.name} at ${market.label}`,
  });

  const message = `Sold ${kgQty} kg of ${crop.name} at ${market.label} for ₦${netRevenue.toLocaleString()}.`;
  pushLog(state, message);
  return { ok: true, message, netRevenue };
}
