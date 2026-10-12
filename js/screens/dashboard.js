import { el, formatNaira, showEventModal, avatarSrc } from "../ui.js";
import { advanceDay, describeDate } from "../engine.js";
import { clearSave, saveGame, STAT_LABELS, pushLog } from "../state.js";
import { resolveEventChoice } from "../events.js";
import { navBar } from "./nav.js";

export function dashboardScreen(state, navigate) {
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

    const nav = navBar("home", navigate);

    const header = el("header", { class: "dash-header" + (state.premium ? " premium" : "") }, [
      el("div", { class: "card-title-row" }, [
        el("img", { class: "avatar-badge", src: avatarSrc(state.player.gender), alt: state.player.name, width: "44", height: "44" }),
        el("div", {}, [
          el("h1", {}, [state.player.farmName, state.premium ? el("span", { class: "premium-badge", title: "Premium Farmer" }, [" ✨"]) : null]),
          el("p", { class: "subtitle" }, [
            `${state.player.name} · ${state.player.homeState} state`,
          ]),
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
            const { dateLine, event } = advanceDay(state);
            pushLog(state, dateLine);
            saveGame(state);
            if (event) {
              showEventModal(event, (choiceIndex) => {
                resolveEventChoice(state, event, choiceIndex);
                saveGame(state);
                redraw();
              });
            }
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
