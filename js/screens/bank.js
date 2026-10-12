import { el, formatNaira, toast, icon } from "../ui.js";
import { totals } from "../finance.js";
import { saveGame, pushLog } from "../state.js";
import { isEmbeddedInLagosLife, ensureVatarSynced, purchasePremium } from "../vatar.js";
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
  let buying = false;
  let retryInFlight = false;
  // Flips false once the player navigates away from this screen instance,
  // so an async continuation (the retry below, or the buy handler further
  // down) that resolves after that doesn't call redraw() on a now-
  // detached DOM node. State changes (saveGame/pushLog) still apply either
  // way — this only guards the redraw.
  let active = true;
  const leavingNavigate = (nextId) => {
    active = false;
    navigate(nextId);
  };

  // ensureVatarSynced() dedups against any other in-flight/settled attempt
  // this session (including main.js's own startup call) and syncs Premium
  // ownership as part of the same attempt — retryInFlight here just stops
  // this screen instance from awaiting it more than once concurrently.
  function maybeSync() {
    if (retryInFlight) return;
    retryInFlight = true;
    ensureVatarSynced(state).then((result) => {
      retryInFlight = false;
      // embedded:false means standalone or a failed attempt — nothing
      // changed, so skip the redraw entirely. Redrawing here would
      // re-invoke renderPremiumCard(), which calls maybeSync() again
      // whenever still not embedded: on a genuinely standalone host,
      // that's an infinite sync-then-redraw loop, not a bounded retry.
      if (!result?.embedded) return;
      if (result.premiumChanged) {
        pushLog(state, "Premium Pass unlocked! ✨");
        saveGame(state);
      }
      if (active) redraw();
    });
  }

  function renderPremiumCard() {
    if (state.premium) {
      return el("div", { class: "card premium-card premium-owned" }, [
        el("div", { class: "card-title-row" }, [icon("logo", 32), el("h3", {}, ["Premium Farmer ✨"])]),
        el("p", { class: "muted" }, ["Thanks for supporting FaRma! Your Premium Pass is active."]),
      ]);
    }

    const body = [
      el("div", { class: "card-title-row" }, [icon("logo", 32), el("h3", {}, ["Premium Pass"])]),
      el("p", { class: "muted" }, ["A one-time pass with a gold farmer badge and theme — more perks on the way."]),
    ];

    if (!isEmbeddedInLagosLife()) {
      maybeSync();
      body.push(el("p", { class: "muted" }, ["Open FaRma inside Lagos Life to buy the Premium Pass."]));
    } else {
      body.push(
        el(
          "button",
          {
            class: "primary-btn",
            type: "button",
            disabled: buying ? "disabled" : null,
            onClick: async () => {
              if (buying) return;
              buying = true;
              redraw();
              const result = await purchasePremium();
              buying = false;
              if (!result.ok) {
                toast(result.message);
                if (active) redraw();
                return;
              }
              state.premium = true;
              pushLog(state, "Bought the Premium Pass! ✨");
              saveGame(state);
              if (active) redraw();
            },
          },
          [buying ? "Opening pay sheet…" : "Buy Premium Pass"]
        )
      );
    }

    return el("div", { class: "card premium-card" }, body);
  }

  function redraw() {
    screen.innerHTML = "";

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
    screen.appendChild(navBar("bank", leavingNavigate));
    screen.appendChild(summary);
    screen.appendChild(renderPremiumCard());
    screen.appendChild(ledger);
  }

  redraw();
  return screen;
}
