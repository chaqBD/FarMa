import { el, formatNaira, toast } from "../ui.js";
import { CROPS, LAND_OPTIONS, findCrop } from "../data.js";
import { saveGame } from "../state.js";
import { leaseLand, preparePlot, SOIL_LABELS, PREP_TIERS } from "../land.js";
import { plantCrop, tendPlot, harvestPlot, isMature, SEED_TIERS, MAX_TENDS_PER_CYCLE } from "../crops.js";
import { navBar } from "./nav.js";

export function landScreen(state, navigate) {
  const screen = el("div", { class: "screen land-screen" });
  let plantFormOpenFor = null;

  function doAction(actionFn, ...args) {
    const result = actionFn(state, ...args);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    saveGame(state);
    plantFormOpenFor = null;
    redraw();
  }

  function soilFitLabel(crop, soil) {
    const factor = crop.soilFit[soil] ?? 0.6;
    if (factor >= 1.0) return "Good fit";
    if (factor >= 0.8) return "OK fit";
    return "Poor fit";
  }

  function renderLeaseOptions() {
    return el("div", { class: "card-grid" }, [
      ...LAND_OPTIONS.map((option) =>
        el("div", { class: "card land-option-card" }, [
          el("h3", {}, [option.label]),
          el("p", { class: "muted" }, [option.areaLabel, ` · ${option.plots} plot${option.plots > 1 ? "s" : ""}`]),
          el("p", { class: "muted" }, ["Soils: " + option.soils.map((s) => SOIL_LABELS[s]).join(", ")]),
          el("p", { class: "cash" }, [formatNaira(option.leaseCost)]),
          el(
            "button",
            { class: "primary-btn", type: "button", onClick: () => doAction(leaseLand, option.id) },
            ["Lease this land"]
          ),
        ])
      ),
    ]);
  }

  function renderPlantForm(plotIndex, plot) {
    const cropSelect = el(
      "select",
      {},
      CROPS.map((c) => el("option", { value: c.id }, [`${c.name} (${soilFitLabel(c, plot.soil)})`]))
    );
    const seedSelect = el(
      "select",
      {},
      Object.entries(SEED_TIERS).map(([id, tier]) =>
        el("option", { value: id }, [`${tier.label} — ${formatNaira(tier.cost)}`])
      )
    );

    return el("div", { class: "plant-form" }, [
      el("label", {}, ["Crop", cropSelect]),
      el("label", {}, ["Seed", seedSelect]),
      el("div", { class: "button-row" }, [
        el(
          "button",
          {
            class: "primary-btn",
            type: "button",
            onClick: () => doAction(plantCrop, plotIndex, cropSelect.value, seedSelect.value),
          },
          ["Plant"]
        ),
        el(
          "button",
          { class: "text-btn", type: "button", onClick: () => { plantFormOpenFor = null; redraw(); } },
          ["Cancel"]
        ),
      ]),
    ]);
  }

  function renderPlotCard(plot, plotIndex) {
    const body = [
      el("h3", {}, [`Plot ${plotIndex + 1}`]),
      el("p", { class: "muted" }, [SOIL_LABELS[plot.soil]]),
      el("div", { class: "stat-bar" }, [
        el("span", { class: "stat-label" }, ["Readiness"]),
        el("div", { class: "stat-track" }, [el("div", { class: "stat-fill", style: `width:${plot.readiness}%` })]),
        el("span", { class: "stat-value" }, [String(plot.readiness)]),
      ]),
    ];

    if (!plot.crop) {
      body.push(
        el("div", { class: "button-row" }, [
          el(
            "button",
            { class: "secondary-btn", type: "button", onClick: () => doAction(preparePlot, plotIndex, "basic") },
            [`${PREP_TIERS.basic.label} (free)`]
          ),
          el(
            "button",
            { class: "secondary-btn", type: "button", onClick: () => doAction(preparePlot, plotIndex, "thorough") },
            [`${PREP_TIERS.thorough.label} (${formatNaira(PREP_TIERS.thorough.cost)})`]
          ),
        ])
      );
      if (plantFormOpenFor === plotIndex) {
        body.push(renderPlantForm(plotIndex, plot));
      } else {
        body.push(
          el(
            "button",
            {
              class: "primary-btn",
              type: "button",
              onClick: () => { plantFormOpenFor = plotIndex; redraw(); },
            },
            ["Plant a crop"]
          )
        );
      }
    } else if (isMature(plot)) {
      const crop = findCrop(plot.crop.cropId);
      body.push(
        el("p", { class: "status-ready" }, [`${crop.name} is ready to harvest!`]),
        el(
          "button",
          { class: "primary-btn", type: "button", onClick: () => doAction(harvestPlot, plotIndex) },
          ["Harvest"]
        )
      );
    } else {
      const crop = findCrop(plot.crop.cropId);
      const pct = Math.min(100, Math.round((plot.crop.daysGrown / crop.cycleDays) * 100));
      body.push(
        el("p", {}, [`Growing ${crop.name} — day ${plot.crop.daysGrown}/${crop.cycleDays}`]),
        el("div", { class: "stat-bar" }, [
          el("span", { class: "stat-label" }, ["Growth"]),
          el("div", { class: "stat-track" }, [el("div", { class: "stat-fill growth", style: `width:${pct}%` })]),
          el("span", { class: "stat-value" }, [`${pct}%`]),
        ]),
        el(
          "button",
          {
            class: "secondary-btn",
            type: "button",
            onClick: () => doAction(tendPlot, plotIndex),
          },
          [`Tend (${plot.crop.tendCount}/${MAX_TENDS_PER_CYCLE} used)`]
        )
      );
    }

    return el("div", { class: "card plot-card" }, body);
  }

  function redraw() {
    screen.innerHTML = "";
    screen.appendChild(el("h1", {}, ["My Land"]));
    screen.appendChild(navBar("land", navigate));

    if (state.land.length === 0) {
      screen.appendChild(el("p", { class: "muted" }, ["You don't have any land yet. Lease a package to get started."]));
      screen.appendChild(renderLeaseOptions());
      return;
    }

    screen.appendChild(
      el(
        "div",
        { class: "card-grid" },
        state.land.map((plot, i) => renderPlotCard(plot, i))
      )
    );

    const leaseMore = el("details", { class: "lease-more" }, [
      el("summary", {}, ["Lease more land"]),
      renderLeaseOptions(),
    ]);
    screen.appendChild(leaseMore);
  }

  redraw();
  return screen;
}
