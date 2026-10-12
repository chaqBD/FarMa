import { loadData } from "./data.js";
import { loadGame, saveGame, pushLog } from "./state.js";
import { render } from "./ui.js";
import { playerCreationScreen } from "./screens/playerCreation.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { landScreen } from "./screens/land.js";
import { marketScreen } from "./screens/market.js";
import { bankScreen } from "./screens/bank.js";
import { workersScreen } from "./screens/workers.js";
import { ensureVatarSynced } from "./vatar.js";

const SCREENS = {
  home: dashboardScreen,
  land: landScreen,
  market: marketScreen,
  bank: bankScreen,
  workers: workersScreen,
};

let currentScreenId = "home";

// How long start() waits for an embedded Vatar handshake (for a returning
// player, see start() below) before giving up on it for *first render
// only* and proceeding as if standalone. ensureVatarSynced() keeps
// running after this — if it resolves late, the Bank screen's own call
// to it (same shared in-flight/settled attempt) still picks it up.
const VATAR_INIT_TIMEOUT_MS = 6000;

function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms))]);
}

function showScreen(state, screenId) {
  currentScreenId = screenId;
  const navigate = (nextId) => showScreen(state, nextId);
  const screenFn = SCREENS[screenId] || dashboardScreen;
  render(screenFn(state, navigate));
}

function applyPremiumChange(state) {
  if (state.premium) pushLog(state, "Premium Pass unlocked! ✨");
  saveGame(state);
}

async function start() {
  await loadData();

  const existingSave = loadGame();
  if (existingSave) {
    // Returning player: worth waiting for (capped) before first render,
    // so Bank's first paint already reflects the right embed/premium
    // status instead of guessing standalone and correcting itself a
    // moment later.
    const result = await withTimeout(ensureVatarSynced(existingSave), VATAR_INIT_TIMEOUT_MS, null);
    if (result?.premiumChanged) applyPremiumChange(existingSave);
    showScreen(existingSave, "home");
  } else {
    // New player: there's no state to sync until character creation
    // completes, so this can only ever happen after first render. The
    // Bank screen's own ensureVatarSynced() call (the same shared
    // attempt) covers the rare case of a returning Vatar player who
    // already owns the pass starting a fresh local save.
    render(
      playerCreationScreen((state) => {
        showScreen(state, "home");
        withTimeout(ensureVatarSynced(state), VATAR_INIT_TIMEOUT_MS, null)
          .then((result) => {
            if (!result?.premiumChanged) return;
            applyPremiumChange(state);
            showScreen(state, currentScreenId);
          })
          .catch((err) => console.warn("Premium sync failed:", err));
      })
    );
  }
}

start().catch((err) => {
  console.error(err);
  document.getElementById("app").textContent =
    "FaRma failed to load. Check the console for details.";
});
