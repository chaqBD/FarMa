import { el, formatNaira } from "../ui.js";
import { totals } from "../finance.js";
import { navBar } from "./nav.js";

const TYPE_LABELS = {
  land_lease: "Land lease",
  land_prep: "Land prep",
  seed: "Seed",
  tending: "Tending",
  sale: "Sale",
  event: "Event",
  hiring: "Hiring",
  wages: "Wages",
};

export function bankScreen(state, navigate) {
  const screen = el("div", { class: "screen bank-screen" });

  const { income, expense, net } = totals(state);
  const recent = state.financeLog.slice(-20).reverse();

  const summary = el("div", { class: "card-grid" }, [
    el("div", { class: "card" }, [el("h3", {}, ["Cash on hand"]), el("p", { class: "cash" }, [formatNaira(state.finances.cash)])]),
    el("div", { class: "card" }, [el("h3", {}, ["Total income"]), el("p", { class: "cash positive" }, [formatNaira(income)])]),
    el("div", { class: "card" }, [el("h3", {}, ["Total expenses"]), el("p", { class: "cash negative" }, [formatNaira(expense)])]),
    el("div", { class: "card" }, [el("h3", {}, ["Net since founding"]), el("p", { class: "cash" + (net >= 0 ? " positive" : " negative") }, [formatNaira(net)])]),
  ]);

  const ledger = el("div", { class: "card" }, [
    el("h2", {}, ["Recent transactions"]),
    recent.length === 0
      ? el("p", { class: "muted" }, ["No transactions yet."])
      : el(
          "table",
          { class: "ledger-table" },
          recent.map((entry) =>
            el("tr", {}, [
              el("td", {}, [`Day ${entry.day}`]),
              el("td", {}, [TYPE_LABELS[entry.type] || entry.type]),
              el("td", {}, [entry.note]),
              el("td", { class: entry.amount >= 0 ? "positive" : "negative" }, [
                (entry.amount >= 0 ? "+" : "") + formatNaira(entry.amount),
              ]),
            ])
          )
        ),
  ]);

  screen.appendChild(el("h1", {}, ["Bank"]));
  screen.appendChild(navBar("bank", navigate));
  screen.appendChild(summary);
  screen.appendChild(ledger);

  return screen;
}
