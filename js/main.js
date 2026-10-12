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
 * no-op when FaRma is played standalone outside Lagos Life. Redraws the
 * current screen only if the player's status actually changed (e.g. they
 * bought the pass on another device, or a purchase that was interrupted
 * mid-game just got confirmed).
 */
async function syncPremiumStatus(state) {
  const vatarInfo = await initVatar();
  if (!vatarInfo) return;

  await restoreInterruptedPurchases();
  const { available, premium } = await checkPremiumEntitlement();
  if (!available || premium === state.premium) return;

  state.premium = premium;
  if (premium) pushLog(state, "Premium Pass unlocked! ✨");
  saveGame(state);
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
