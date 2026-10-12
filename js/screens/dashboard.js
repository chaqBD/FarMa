import { el, formatNaira, toast } from "../ui.js";
import { advanceDay, describeDate } from "../engine.js";
import { clearSave, saveGame, STAT_LABELS } from "../state.js";

const NAV_ITEMS = [
  { id: "home", label: "Home", enabled: true },
  { id: "land", label: "My Land", enabled: false },
  { id: "shop", label: "Shop", enabled: false },
  { id: "workers", label: "Workers", enabled: false },
  { id: "livestock", label: "Livestock", enabled: false },
  { id: "market", label: "Market", enabled: false },
  { id: "bank", label: "Bank", enabled: false },
  { id: "life", label: "Life", enabled: false },
];

export function dashboardScreen(state) {
  const screen = el("div", { class: "screen dashboard" });

  function renderStatBar(stat) {
    const value = state.player.stats[stat];
    return el("div", { class: "stat-bar" }, [
      el("span", { class: "stat-label" }, [STAT_LABELS[stat]]),
      el("div", { class: "stat-track" }, [
        el("div", { class: "stat-fill", style: `width:${value}%` }),
      ]),
      el("span", { class: "stat-value" }, [String(Math.round(value))]),
    ]);
  }

  function renderLog() {
    const entries = state.log.slice(-6).reverse();
    return el(
      "ul",
      { class: "log-feed" },
      entries.map((entry) => el("li", {}, [entry]))
    );
  }

  function redraw() {
    screen.innerHTML = "";

    const nav = el(
      "nav",
      { class: "nav-bar" },
      NAV_ITEMS.map((item) =>
        el(
          "button",
          {
            type: "button",
            class: "nav-btn" + (item.enabled ? "" : " disabled"),
            title: item.enabled ? "" : "Coming soon",
            onClick: () => {
              if (!item.enabled) return toast(`${item.label}: coming soon`);
            },
          },
          [item.label]
        )
      )
    );

    const header = el("header", { class: "dash-header" }, [
      el("div", {}, [
        el("h1", {}, [state.player.farmName]),
        el("p", { class: "subtitle" }, [
          `${state.player.name} · ${state.player.homeState} state`,
        ]),
      ]),
      el("div", { class: "cash-display" }, [formatNaira(state.finances.cash)]),
    ]);

    const dateCard = el("div", { class: "card date-card" }, [
      el("p", { class: "date-label" }, [describeDate(state.time)]),
      el(
        "button",
        {
          class: "primary-btn",
          type: "button",
          onClick: () => {
            const dateLine = advanceDay(state);
            state.log.push(dateLine);
            saveGame(state);
            redraw();
          },
        },
        ["Next Day →"]
      ),
    ]);

    const statsCard = el("div", { class: "card stats-card" }, [
      el("h2", {}, ["Your Stats"]),
      ...Object.keys(STAT_LABELS).map(renderStatBar),
    ]);

    const logCard = el("div", { class: "card log-card" }, [
      el("h2", {}, ["FaRma Times"]),
      renderLog(),
    ]);

    const resetBtn = el(
      "button",
      {
        class: "text-btn",
        type: "button",
        onClick: () => {
          if (!confirm("Abandon this farm and start a new game?")) return;
          clearSave();
          window.location.reload();
        },
      },
      ["Abandon farm / new game"]
    );

    screen.appendChild(header);
    screen.appendChild(nav);
    screen.appendChild(el("div", { class: "card-grid" }, [dateCard, statsCard, logCard]));
    screen.appendChild(resetBtn);
  }

  redraw();
  return screen;
}
