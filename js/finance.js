import { dayIndex } from "./state.js";

/**
 * Records a cash movement in the ledger. Does not itself change
 * state.finances.cash — callers apply the cash change and call this
 * alongside it, so the ledger always reflects what actually happened.
 * `amount` is signed: positive for income, negative for an expense.
 */
export function recordTransaction(state, { type, amount, note }) {
  state.financeLog.push({ day: dayIndex(state.time), type, amount, note });
}

export function totals(state) {
  let income = 0;
  let expense = 0;
  for (const entry of state.financeLog) {
    if (entry.amount >= 0) income += entry.amount;
    else expense += -entry.amount;
  }
  return { income, expense, net: income - expense };
}
