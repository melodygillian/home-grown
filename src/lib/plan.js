// Reads a garden plan (the JSON your teammate's planning part produces) and checks it.
// Format is documented in PLAN_FORMAT.md.
import { getSpecies, registerSpecies } from './catalog.js';

const SUNS = ['full_sun', 'part_shade', 'shade'];
const MOISTURES = ['wet', 'wet_mesic', 'mesic', 'dry_mesic', 'dry'];

export function checkPlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== 'object') return ['The file is not a garden plan.'];
  registerSpecies(plan.species);
  if (!(plan.width_ft > 0) || !(plan.length_ft > 0)) errors.push('width_ft and length_ft must be positive numbers.');
  const cell = plan.cell_ft || 1;
  const cols = Math.round(plan.width_ft / cell);
  const rows = Math.round(plan.length_ft / cell);
  if (!Array.isArray(plan.cells) || plan.cells.length !== rows || plan.cells.some((r) => !Array.isArray(r) || r.length !== cols)) {
    errors.push(`cells must be ${rows} rows × ${cols} columns (length_ft ÷ cell_ft by width_ft ÷ cell_ft).`);
  } else {
    plan.cells.forEach((r, y) =>
      r.forEach((c, x) => {
        if (!SUNS.includes(c.sun)) errors.push(`Cell (${x},${y}) has unknown sun "${c.sun}".`);
        if (!MOISTURES.includes(c.moisture)) errors.push(`Cell (${x},${y}) has unknown moisture "${c.moisture}".`);
      }),
    );
  }
  (plan.plants || []).forEach((p) => {
    if (!getSpecies(p.species)) errors.push(`Plant ${p.id}: unknown species "${p.species}".`);
  });
  return errors.slice(0, 8);
}

/** Turn a plan into the app's starting garden: every planned plant starts locked. */
export function gardenFromPlan(plan) {
  return (plan.plants || []).map((p, i) => ({
    id: String(p.id ?? 'p' + (i + 1)),
    species: p.species,
    x: p.x,
    y: p.y,
    size: p.size,
    status: 'planned',
    plantedOn: null,
    logs: [],
    analysis: null,
  }));
}
