// Fake sensor stakes for the hackathon demo.
// Readings are based on the grid cell's sun / moisture level and today's weather,
// with a gentle wobble so they look live.
import { sizeOf, cellsOf, majority } from './catalog.js';
import { hashUnit } from './growth.js';

const BASE_MOISTURE = { wet: 58, wet_mesic: 46, mesic: 36, dry_mesic: 27, dry: 19 };
const SUN_HOURS = { full_sun: 8.3, part_shade: 5.1, shade: 2.6 };

/** The sensor stake watching this plant, if any (a stake covers cells within `radius`). */
export function stakeFor(plan, plant) {
  const cells = cellsOf(plant.x, plant.y, sizeOf(plan, plant));
  return (plan.sensors || []).find((st) =>
    cells.some(([x, y]) => Math.max(Math.abs(x - st.x), Math.abs(y - st.y)) <= (st.radius ?? 2)),
  );
}

export function readingsFor(plan, plant, today, now = Date.now()) {
  const cells = cellsOf(plant.x, plant.y, sizeOf(plan, plant));
  const m = majority(plan, cells, 'moisture') || 'mesic';
  const sun = majority(plan, cells, 'sun') || 'full_sun';
  const wobble = Math.sin(now / 600000 + hashUnit(plant.id) * 6) * 1.5;
  let moisture = BASE_MOISTURE[m];
  let temp = 68;
  let sunHours = SUN_HOURS[sun];
  if (today) {
    if (today.hi > 75) moisture -= (today.hi - 75) * 0.35;
    if (today.pop >= 60) moisture += 10;
    temp = Math.round((today.hi + (today.lo ?? today.hi - 15)) / 2 - 2);
    if (today.pop >= 60 || /cloud|rain|snow|showers/i.test(today.short || '')) sunHours *= 0.55;
  }
  return {
    moisture: Math.max(4, Math.min(70, Math.round(moisture + wobble))),
    soilTempF: temp,
    sunHours: Math.round(sunHours * 10) / 10,
  };
}
