import { loadData } from "./data.js";
import { loadGame, saveGame, pushLog } from "./state.js";
import { render } from "./ui.js";
import { playerCreationScreen } from "./screens/playerCreation.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { landScreen } from "./screens/land.js";
import { marketScreen } from "./screens/market.js";
import { bankScreen } from "./screens/bank.js";
import { workersScreen } from "./screens/workers.js";
import { initVatar, syncPremiumFromVatar } from "./vatar.js";

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
 * Restores any interrupted purchase and syncs Premium Pass status from
 * Vatar, in the background after the game has already rendered. Only
 * redraws if state.premium actually changed — a full redraw tears down
 * and rebuilds the current screen's DOM (render() does innerHTML = ""),
 * which would risk wiping in-progress form input or colliding with an
 * in-flight purchase click if it fired more freely. This never touches
 * isEmbeddedInLagosLife()'s *display* correctness, because — unlike an
 * earlier version of this function — that's no longer decided late: see
 * start(), which awaits initVatar() before the very first render, so
 * every screen's first paint already reflects the right embed status
 * with no race to patch up here.
 */
async function syncPremiumStatus(state, vatarInfo) {
  if (!vatarInfo) return;

  const changed = await syncPremiumFromVatar(state);
  if (!changed) return;

  if (state.premium) pushLog(state, "Premium Pass unlocked! ✨");
  saveGame(state);
  showScreen(state, currentScreenId);
}

async function start() {
  await loadData();

  // Standalone play (the common case — no window.Vatar at all) resolves
  // this instantly, so first paint is never delayed for it. Only an
  // embedded session waits here, for the handshake with the Lagos Life
  // frame — worth it so every screen's first render already knows
  // whether it's embedded, instead of guessing standalone and
  // correcting itself a moment later.
  const vatarInfo = await initVatar();

  const existingSave = loadGame();
  if (existingSave) {
    showScreen(existingSave, "home");
    syncPremiumStatus(existingSave, vatarInfo).catch((err) => console.warn("Premium sync failed:", err));
  } else {
    render(
      playerCreationScreen((state) => {
        showScreen(state, "home");
        syncPremiumStatus(state, vatarInfo).catch((err) => console.warn("Premium sync failed:", err));
      })
    );
  }
}

start().catch((err) => {
  console.error(err);
  document.getElementById("app").textContent =
    "FaRma failed to load. Check the console for details.";
});
