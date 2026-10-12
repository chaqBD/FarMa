import { el, formatNaira, toast } from "../ui.js";
import { MARKETS, findCrop } from "../data.js";
import { saveGame } from "../state.js";
import { priceFor, sellCrop } from "../market.js";
import { navBar } from "./nav.js";

export function marketScreen(state, navigate) {
  const screen = el("div", { class: "screen market-screen" });

  function renderPriceTable(cropId) {
    return el(
      "table",
      { class: "price-table" },
      MARKETS.map((market) => {
        const price = priceFor(state, cropId, market.id);
        return el("tr", {}, [
          el("td", {}, [market.label]),
          el("td", {}, [formatNaira(price) + "/kg"]),
        ]);
      })
    );
  }

  function renderCropCard(cropId, kg) {
    const crop = findCrop(cropId);
    const marketSelect = el(
      "select",
      {},
      MARKETS.map((m) => el("option", { value: m.id }, [m.label]))
    );
    const qtyInput = el("input", { type: "number", min: "1", max: String(kg), value: String(kg) });

    return el("div", { class: "card crop-market-card" }, [
      el("h3", {}, [`${crop.name} — ${kg} kg in store`]),
      el("p", { class: "muted" }, ["Today's prices:"]),
      renderPriceTable(cropId),
      el("div", { class: "form-row" }, [
        el("label", {}, ["Market", marketSelect]),
        el("label", {}, ["Quantity (kg)", qtyInput]),
      ]),
      el(
        "button",
        {
          class: "primary-btn",
          type: "button",
          onClick: () => {
            const result = sellCrop(state, cropId, marketSelect.value, qtyInput.value);
            if (!result.ok) return toast(result.message);
            saveGame(state);
            redraw();
          },
        },
        ["Sell"]
      ),
    ]);
  }

  function redraw() {
    screen.innerHTML = "";
    screen.appendChild(el("h1", {}, ["Market"]));
    screen.appendChild(navBar("market", navigate));

    const entries = Object.entries(state.inventory).filter(([, kg]) => kg > 0);
    if (entries.length === 0) {
      screen.appendChild(el("p", { class: "muted" }, ["Nothing to sell yet — harvest a crop from My Land first."]));
      return;
    }

    screen.appendChild(
      el(
        "div",
        { class: "card-grid" },
        entries.map(([cropId, kg]) => renderCropCard(cropId, kg))
      )
    );
  }

  redraw();
  return screen;
}
