import { dayIndex } from "./state.js";

// The ledger only needs to show recent activity (bankScreen displays the
// last 20); older entries are trimmed so a long game doesn't grow the save
// file without bound. Lifetime income/expense are tracked separately on
// state.finances so trimming the log never affects the totals shown.
const MAX_LOG_ENTRIES = 200;

/**
 * Records a cash movement in the ledger. Does not itself change
 * state.finances.cash — callers apply the cash change and call this
 * alongside it, so the ledger always reflects what actually happened.
 * `amount` is signed: positive for income, negative for an expense.
 */
export function recordTransaction(state, { type, amount, note }) {
  state.financeLog.push({ day: dayIndex(state.time), type, amount, note });
  if (state.financeLog.length > MAX_LOG_ENTRIES) {
    state.financeLog.splice(0, state.financeLog.length - MAX_LOG_ENTRIES);
  }

  if (amount >= 0) state.finances.lifetimeIncome += amount;
  else state.finances.lifetimeExpense += -amount;
}

export function totals(state) {
  const income = state.finances.lifetimeIncome;
  const expense = state.finances.lifetimeExpense;
  return { income, expense, net: income - expense };
}
