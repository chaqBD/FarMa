import { el, formatNaira, toast } from "../ui.js";
import { saveGame } from "../state.js";
import { HIRE_CHANNELS, hireWorker, assignWorker, fireWorker } from "../workers.js";
import { isMature } from "../crops.js";
import { navBar } from "./nav.js";

export function workersScreen(state, navigate) {
  const screen = el("div", { class: "screen workers-screen" });

  function doAction(actionFn, ...args) {
    const result = actionFn(state, ...args);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    saveGame(state);
    redraw();
  }

  function renderHireOptions() {
    return el(
      "div",
      { class: "card-grid" },
      Object.entries(HIRE_CHANNELS).map(([id, channel]) =>
        el("div", { class: "card hire-card" }, [
          el("h3", {}, [channel.label]),
          el("p", { class: "muted" }, [channel.description]),
          el("p", { class: "muted" }, [`Skill range: ${channel.skillRange[0]}–${channel.skillRange[1]}`]),
          el("p", { class: "cash" }, [formatNaira(channel.signingFee) + " signing fee"]),
          el(
            "button",
            { class: "primary-btn", type: "button", onClick: () => doAction(hireWorker, id) },
            ["Hire"]
          ),
        ])
      )
    );
  }

  function assignablePlots() {
    return state.land
      .map((plot, index) => ({ plot, index }))
      .filter(({ plot }) => plot.crop && !isMature(plot));
  }

  function renderWorkerCard(worker) {
    const plots = assignablePlots();
    // If this worker's current plot has since gone mature (or otherwise
    // fallen out of assignablePlots()), still offer it so the dropdown
    // reflects their real assignment — otherwise .value below would match
    // no option, read back as "", and "Set assignment" would silently
    // unassign a worker the player never touched.
    const currentIndex = worker.assignedPlotIndex;
    const options = plots.map(({ index }) => ({ index, label: `Plot ${index + 1}` }));
    if (currentIndex !== null && !options.some((o) => o.index === currentIndex) && state.land[currentIndex]) {
      options.push({ index: currentIndex, label: `Plot ${currentIndex + 1} (not growing)` });
    }

    const assignSelect = el("select", {}, [
      el("option", { value: "" }, ["Unassigned"]),
      ...options.map(({ index, label }) => el("option", { value: String(index) }, [label])),
    ]);
    assignSelect.value = currentIndex === null ? "" : String(currentIndex);

    return el("div", { class: "card worker-card" }, [
      el("h3", {}, [worker.name]),
      el("p", { class: "muted" }, [`Skill ${worker.skill} · ${formatNaira(worker.dailyWage)}/day`]),
      el("div", { class: "stat-bar" }, [
        el("span", { class: "stat-label" }, ["Morale"]),
        el("div", { class: "stat-track" }, [el("div", { class: "stat-fill", style: `width:${worker.morale}%` })]),
        el("span", { class: "stat-value" }, [String(Math.round(worker.morale))]),
      ]),
      el("label", {}, [
        "Assign to",
        assignSelect,
      ]),
      el("div", { class: "button-row" }, [
        el(
          "button",
          {
            class: "secondary-btn",
            type: "button",
            onClick: () => {
              const value = assignSelect.value;
              doAction(assignWorker, worker.id, value === "" ? null : Number(value));
            },
          },
          ["Set assignment"]
        ),
        el(
          "button",
          { class: "secondary-btn", type: "button", onClick: () => doAction(fireWorker, worker.id) },
          ["Let go"]
        ),
      ]),
    ]);
  }

  function redraw() {
    screen.innerHTML = "";
    screen.appendChild(el("h1", {}, ["Workers"]));
    screen.appendChild(navBar("workers", navigate));

    if (state.workers.length > 0) {
      screen.appendChild(
        el(
          "div",
          { class: "card-grid" },
          state.workers.map(renderWorkerCard)
        )
      );
    } else {
      screen.appendChild(el("p", { class: "muted" }, ["No one on staff yet. Hire your first hand below."]));
    }

    screen.appendChild(el("h2", {}, ["Hire someone"]));
    screen.appendChild(
      el("p", { class: "muted" }, [
        "Assigned workers automatically tend their plot each day — skill and morale decide how much it helps. Wages are paid daily; if you can't cover them, morale crashes and workers may quit.",
      ])
    );
    screen.appendChild(renderHireOptions());
  }

  redraw();
  return screen;
}
