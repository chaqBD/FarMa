import { loadData } from "./data.js";
import { loadGame, saveGame, pushLog } from "./state.js";
import { render } from "./ui.js";
import { playerCreationScreen } from "./screens/playerCreation.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { landScreen } from "./screens/land.js";
import { marketScreen } from "./screens/market.js";
import { bankScreen } from "./screens/bank.js";
import { workersScreen } from "./screens/workers.js";
import { initVatar, restoreInterruptedPurchases, checkPremiumEntitlement } from "./vatar.js";

const SCREENS = {
  home: dashboardScreen,
  land: landScreen,
  market: marketScreen,
  bank: bankScreen,
  workers: workersScreen,
};

// Screens whose own rendering reads isEmbeddedInLagosLife() (not just
// state.premium) — currently just Bank. A screen added here must also
// have no risky in-progress form state, since syncPremiumStatus's redraw
// fully tears down and rebuilds the screen's DOM.
const SCREENS_READING_EMBED_STATUS = new Set(["bank"]);

let currentScreenId = "home";

function showScreen(state, screenId) {
  currentScreenId = screenId;
  const navigate = (nextId) => showScreen(state, nextId);
  const screenFn = SCREENS[screenId] || dashboardScreen;
  render(screenFn(state, navigate));
}

/**
 * Syncs Premium Pass status from Vatar in the background, after the game
 * has already rendered — this never blocks first paint, and is a silent
 * no-op when FaRma is played standalone outside Lagos Life.
 *
 * Redraws are deliberately narrow: a full redraw tears down and rebuilds
 * the current screen's DOM (render() does innerHTML = ""), which would
 * wipe any in-progress, unsaved form input (e.g. a quantity field on
 * Market) if it fired on every embedded load. So this only redraws when
 * state.premium actually changed (affects the dashboard's badge), or
 * when the player is already looking at the Bank screen, whose "Buy
 * Premium Pass" vs "open inside Lagos Life" UI depends on
 * isEmbeddedInLagosLife() itself, not just state.premium — that flips
 * from unknown to known right here even on a run where premium stays
 * false, and the Bank screen has no in-progress form input to lose.
 */
async function syncPremiumStatus(state) {
  const vatarInfo = await initVatar();
  if (!vatarInfo) return;

  await restoreInterruptedPurchases();
  const { available, premium } = await checkPremiumEntitlement();

  let premiumChanged = false;
  if (available && premium !== state.premium) {
    state.premium = premium;
    if (premium) pushLog(state, "Premium Pass unlocked! ✨");
    saveGame(state);
    premiumChanged = true;
  }

  if (!premiumChanged && !SCREENS_READING_EMBED_STATUS.has(currentScreenId)) return;
  showScreen(state, currentScreenId);
}

async function start() {
  await loadData();

  const existingSave = loadGame();
  if (existingSave) {
    showScreen(existingSave, "home");
    syncPremiumStatus(existingSave).catch((err) => console.warn("Premium sync failed:", err));
  } else {
    render(
      playerCreationScreen((state) => {
        showScreen(state, "home");
        syncPremiumStatus(state).catch((err) => console.warn("Premium sync failed:", err));
      })
    );
  }
}

start().catch((err) => {
  console.error(err);
  document.getElementById("app").textContent =
    "FaRma failed to load. Check the console for details.";
});
