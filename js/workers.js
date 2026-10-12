import { clampStat, pushLog } from "./state.js";
import { recordTransaction } from "./finance.js";
import { isMature } from "./crops.js";

const NAME_POOL = [
  "Adaeze", "Chidi", "Bisi", "Tunde", "Ngozi", "Emeka", "Folake", "Kelechi",
  "Amina", "Musa", "Chiamaka", "Segun", "Aisha", "Obinna", "Yetunde", "Ibrahim",
  "Chinwe", "Taiwo", "Kemi", "Uche", "Hauwa", "Damilare", "Blessing", "Sani",
];

export const HIRE_CHANNELS = {
  village_head: {
    label: "Village head referral",
    description: "Reliable, takes a little longer to arrange.",
    signingFee: 5000,
    skillRange: [50, 70],
    moraleStart: 70,
  },
  motor_park: {
    label: "Motor park call",
    description: "Fast and cheap, but it's a gamble on who shows up.",
    signingFee: 2000,
    skillRange: [30, 65],
    moraleStart: 50,
  },
  labour_agent: {
    label: "Labour agent",
    description: "Costs an agent's fee, but guarantees a skilled hand.",
    signingFee: 15000,
    skillRange: [60, 85],
    moraleStart: 65,
  },
};

const MAX_DAILY_CARE_GAIN = 3;
const MORALE_RECOVERY_WHEN_PAID = 1;
const MORALE_PENALTY_WHEN_UNPAID = 15;
const QUIT_CHANCE_AT_ZERO_MORALE = 0.3;

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function wageForSkill(skill) {
  return Math.round(1200 + skill * 8);
}

export function hireWorker(state, channelId) {
  const channel = HIRE_CHANNELS[channelId];
  if (!channel) return { ok: false, message: "No such hiring channel." };
  if (state.finances.cash < channel.signingFee) {
    return { ok: false, message: `You need ₦${channel.signingFee.toLocaleString()} to hire this way.` };
  }

  const skill = randomInt(channel.skillRange[0], channel.skillRange[1]);
  const worker = {
    id: state.nextWorkerId++,
    name: NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)],
    skill,
    morale: channel.moraleStart,
    dailyWage: wageForSkill(skill),
    assignedPlotIndex: null,
  };

  state.finances.cash -= channel.signingFee;
  recordTransaction(state, {
    type: "hiring",
    amount: -channel.signingFee,
    note: `Hired ${worker.name} via ${channel.label}`,
  });
  state.workers.push(worker);

  const message = `${worker.name} joined the farm (skill ${skill}, ₦${worker.dailyWage}/day) via ${channel.label}.`;
  pushLog(state, message);
  return { ok: true, message, worker };
}

/** Assigns a worker to auto-tend a plot each day. Pass plotIndex=null to unassign. */
export function assignWorker(state, workerId, plotIndex) {
  const worker = state.workers.find((w) => w.id === workerId);
  if (!worker) return { ok: false, message: "No such worker." };
  if (plotIndex !== null && !state.land[plotIndex]) return { ok: false, message: "No such plot." };

  worker.assignedPlotIndex = plotIndex;
  const message = plotIndex === null ? `${worker.name} is now unassigned.` : `${worker.name} assigned to Plot ${plotIndex + 1}.`;
  pushLog(state, message);
  return { ok: true, message };
}

export function fireWorker(state, workerId) {
  const index = state.workers.findIndex((w) => w.id === workerId);
  if (index === -1) return { ok: false, message: "No such worker." };

  const [worker] = state.workers.splice(index, 1);
  const message = `${worker.name} has left the farm.`;
  pushLog(state, message);
  return { ok: true, message };
}

/**
 * Called once per day-advance: pays wages (or crashes morale if cash can't
 * cover them), lets assigned workers auto-tend their plot, and checks
 * whether anyone at rock-bottom morale quits.
 */
export function dailyWorkerUpkeep(state) {
  if (state.workers.length === 0) return;

  const totalWage = state.workers.reduce((sum, w) => sum + w.dailyWage, 0);
  if (state.finances.cash >= totalWage) {
    state.finances.cash -= totalWage;
    recordTransaction(state, {
      type: "wages",
      amount: -totalWage,
      note: `Daily wages (${state.workers.length} worker${state.workers.length > 1 ? "s" : ""})`,
    });
    for (const worker of state.workers) worker.morale = clampStat(worker.morale + MORALE_RECOVERY_WHEN_PAID);
  } else {
    for (const worker of state.workers) worker.morale = clampStat(worker.morale - MORALE_PENALTY_WHEN_UNPAID);
  }

  for (const worker of state.workers) {
    if (worker.assignedPlotIndex === null) continue;
    const plot = state.land[worker.assignedPlotIndex];
    if (!plot || !plot.crop || isMature(plot)) continue;
    const careGain = Math.round((worker.skill / 100) * MAX_DAILY_CARE_GAIN * (worker.morale / 100));
    plot.crop.care = clampStat(plot.crop.care + careGain);
  }

  const staying = [];
  for (const worker of state.workers) {
    if (worker.morale <= 0 && Math.random() < QUIT_CHANCE_AT_ZERO_MORALE) {
      pushLog(state, `${worker.name} has quit — unpaid too long.`);
    } else {
      staying.push(worker);
    }
  }
  state.workers = staying;
}
