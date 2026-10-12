import { loadData } from "./data.js";
import { loadGame } from "./state.js";
import { render } from "./ui.js";
import { playerCreationScreen } from "./screens/playerCreation.js";
import { dashboardScreen } from "./screens/dashboard.js";

async function start() {
  await loadData();

  const existingSave = loadGame();
  if (existingSave) {
    render(dashboardScreen(existingSave));
  } else {
    render(playerCreationScreen((state) => render(dashboardScreen(state))));
  }
}

start().catch((err) => {
  console.error(err);
  document.getElementById("app").textContent =
    "FaRma failed to load. Check the console for details.";
});
