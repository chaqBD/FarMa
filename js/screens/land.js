import { el, formatNaira, toast, icon } from "../ui.js";
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
          el("div", { class: "card-title-row" }, [icon("logo", 32), el("h3", {}, [option.label])]),
          el("p", { class: "muted" }, [option.areaLabel, ` · ${option.plots} plot${option.plots > 1 ? "s" : ""}`]),
          el("div", { class: "soil-chip-row" }, option.soils.map((s) => el("span", { class: "soil-chip" }, [icon(s, 20), SOIL_LABELS[s]]))),
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
    let selectedCropId = CROPS[0].id;
    const cropPicker = el("div", { class: "crop-picker", role: "group", "aria-label": "Choose a crop to plant" });

    function drawCropPicker() {
      cropPicker.innerHTML = "";
      for (const c of CROPS) {
        const fit = soilFitLabel(c, plot.soil);
        const isSelected = c.id === selectedCropId;
        const chip = el(
          "button",
          {
            type: "button",
            class: "crop-chip" + (isSelected ? " selected" : "") + " fit-" + fit.replace(" ", "-"),
            "aria-pressed": isSelected ? "true" : "false",
            "aria-label": `${c.name}, ${fit}`,
            onClick: () => { selectedCropId = c.id; drawCropPicker(); },
          },
          [icon(c.id, 32), el("span", {}, [c.name]), el("span", { class: "fit-label" }, [fit])]
        );
        cropPicker.appendChild(chip);
      }
    }
    drawCropPicker();

    const seedSelect = el(
      "select",
      {},
      Object.entries(SEED_TIERS).map(([id, tier]) =>
        el("option", { value: id }, [`${tier.label} — ${formatNaira(tier.cost)}`])
      )
    );

    return el("div", { class: "plant-form" }, [
      el("label", {}, ["Crop", cropPicker]),
      el("label", {}, ["Seed", seedSelect]),
      el("div", { class: "button-row" }, [
        el(
          "button",
          {
            class: "primary-btn",
            type: "button",
            onClick: () => doAction(plantCrop, plotIndex, selectedCropId, seedSelect.value),
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
      el("div", { class: "card-title-row" }, [
        icon(plot.soil, 32),
        el("div", {}, [
          el("h3", {}, [`Plot ${plotIndex + 1}`]),
          el("p", { class: "muted plot-soil-label" }, [SOIL_LABELS[plot.soil]]),
        ]),
      ]),
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
        el("div", { class: "crop-row" }, [icon(crop.id, 36), el("p", { class: "status-ready" }, [`${crop.name} is ready to harvest!`])]),
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
        el("div", { class: "crop-row" }, [icon(crop.id, 36), el("p", {}, [`Growing ${crop.name} — day ${plot.crop.daysGrown}/${crop.cycleDays}`])]),
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
      screen.appendChild(
        el("div", { class: "empty-land-banner" }, [
          el("img", { src: "images/scenes/empty-land.jpg", alt: "An illustration of a small farm plot", width: "160", height: "160" }),
          el("p", { class: "muted" }, ["You don't have any land yet. Lease a package to get started."]),
        ])
      );
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
