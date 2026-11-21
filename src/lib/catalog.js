// The shared plant catalog and the rules for how much grid space a plant takes.
import catalogData from '../data/ma-native-plants.json';

export const CATALOG = catalogData.plants;
const BY_ID = Object.fromEntries(CATALOG.map((p) => [p.id, p]));
// Extra species that arrive with a plan (e.g. plants the planner found in FloraAPI that aren't in our catalog).
const EXTRA = new Map();

export function registerSpecies(list) {
  for (const s of list || []) if (s && s.id && !BY_ID[s.id]) EXTRA.set(s.id, s);
}

export function getSpecies(id) {
  return BY_ID[id] || EXTRA.get(id) || null;
}

export function allSpecies() {
  return [...CATALOG, ...EXTRA.values()];
}

export const SUN_LABEL = { full_sun: 'Sunny', part_shade: 'Partly shady', shade: 'Shady' };
export const MOISTURE_LABEL = {
  wet: 'Wet',
  wet_mesic: 'Wet-mesic',
  mesic: 'Mesic (average)',
  dry_mesic: 'Dry-mesic',
  dry: 'Dry',
};

/** Number of grid cells per side a plant needs, based on its mature spread. */
export function footprint(species, cellFt) {
  if (!species) return 1;
  const spreadFt = species.spread_cm / 30.48;
  return Math.max(1, Math.ceil(spreadFt / (cellFt || 1) - 0.05));
}

/** Grid size of a placed plant: the plan's own size if given (planner imports), else from its species. */
export function sizeOf(plan, plant) {
  return plant.size || footprint(getSpecies(plant.species), plan.cell_ft);
}

/** Cells covered by a plant placed with its top-left corner at (x, y). */
export function cellsOf(x, y, size) {
  const out = [];
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push([x + dx, y + dy]);
  return out;
}

/** The most common sun / moisture value in a set of cells. */
export function majority(plan, cells, key) {
  const counts = {};
  for (const [x, y] of cells) {
    const v = plan.cells?.[y]?.[x]?.[key];
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** Can `species` go at (x, y) without leaving the garden or overlapping another active plant? */
export function canPlace(plan, plants, species, x, y, ignoreId) {
  const size = footprint(species, plan.cell_ft);
  const cols = plan.cells[0].length;
  const rows = plan.cells.length;
  if (x + size > cols || y + size > rows) return false;
  const taken = new Set();
  for (const p of plants) {
    if (p.id === ignoreId || p.status === 'removed') continue;
    for (const [cx, cy] of cellsOf(p.x, p.y, sizeOf(plan, p))) taken.add(cx + ',' + cy);
  }
  return cellsOf(x, y, size).every(([cx, cy]) => !taken.has(cx + ',' + cy));
}

/** Native plants that suit the sun and moisture at a spot and fit there. */
export function suggestionsFor(plan, plants, spot) {
  const area = cellsOf(spot.x, spot.y, spot.size || 1);
  const sun = majority(plan, area, 'sun');
  const moisture = majority(plan, area, 'moisture');
  return allSpecies().filter(
    (s) => s.sun.includes(sun) && s.moisture.includes(moisture) && canPlace(plan, plants, s, spot.x, spot.y, spot.id),
  )
    .map((s) => ({ species: s, size: footprint(s, plan.cell_ft) }))
    .sort((a, b) => b.size - a.size || a.species.common.localeCompare(b.species.common));
}

export function cmToIn(cm) {
  return Math.round(cm / 2.54);
}

export function heightText(cm) {
  const inches = cmToIn(cm);
  if (inches >= 36) return `${(inches / 12).toFixed(inches % 12 === 0 ? 0 : 1)} ft`;
  return `${inches} in`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function bloomText(bloom) {
  if (!bloom || !bloom.length) return 'No flowers (foliage plant)';
  return bloom.length === 1 ? MONTHS[bloom[0] - 1] : `${MONTHS[bloom[0] - 1]}–${MONTHS[bloom[bloom.length - 1] - 1]}`;
}
