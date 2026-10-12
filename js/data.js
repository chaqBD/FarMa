// Live bindings populated by loadData(). Other modules import these names;
// ES module bindings are live references, so they see the populated values
// once loadData() has resolved (main.js awaits it before anything else runs).
export let CONFIG = {};
export let BACKGROUNDS = [];
export let CROPS = [];
export let LAND_OPTIONS = [];

export async function loadData() {
  const [config, backgrounds, crops, landOptions] = await Promise.all([
    fetchJson("data/config.json"),
    fetchJson("data/backgrounds.json"),
    fetchJson("data/crops.json"),
    fetchJson("data/land.json"),
  ]);
  CONFIG = config;
  BACKGROUNDS = backgrounds;
  CROPS = crops;
  LAND_OPTIONS = landOptions;
}

export function findCrop(id) {
  return CROPS.find((c) => c.id === id);
}

export function findLandOption(id) {
  return LAND_OPTIONS.find((o) => o.id === id);
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
