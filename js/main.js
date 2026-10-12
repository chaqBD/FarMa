import { loadData } from "./data.js";
import { loadGame } from "./state.js";
import { render } from "./ui.js";
import { playerCreationScreen } from "./screens/playerCreation.js";
import { dashboardScreen } from "./screens/dashboard.js";
import { landScreen } from "./screens/land.js";

const SCREENS = {
  home: dashboardScreen,
  land: landScreen,
};

function showScreen(state, screenId) {
  const navigate = (nextId) => showScreen(state, nextId);
  const screenFn = SCREENS[screenId] || dashboardScreen;
  render(screenFn(state, navigate));
}

async function start() {
  await loadData();

  const existingSave = loadGame();
  if (existingSave) {
    showScreen(existingSave, "home");
  } else {
    render(playerCreationScreen((state) => showScreen(state, "home")));
  }
}

start().catch((err) => {
  console.error(err);
  document.getElementById("app").textContent =
    "FaRma failed to load. Check the console for details.";
});
