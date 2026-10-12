// Live bindings populated by loadData(). Other modules import these names;
// ES module bindings are live references, so they see the populated values
// once loadData() has resolved (main.js awaits it before anything else runs).
export let CONFIG = {};
export let BACKGROUNDS = [];

export async function loadData() {
  const [config, backgrounds] = await Promise.all([
    fetchJson("data/config.json"),
    fetchJson("data/backgrounds.json"),
  ]);
  CONFIG = config;
  BACKGROUNDS = backgrounds;
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
