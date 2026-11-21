// Turns a plan from the BayState Bloom planner (part 1) into this app's garden plan.
//
// The planner uses:  1-ft grid, sun = Sun | Part Shade | Shade, moisture = Dry | Moist | Wet,
//                    plants placed by their CENTER (cx, cy in feet) with a round spread (spreadFt),
//                    plant data from FloraAPI.
// This app uses:     a grid of cells, 5 moisture levels, plants placed by their TOP-LEFT cell,
//                    species from src/data/ma-native-plants.json.
// Plants that are also in our catalog (same scientific name) use our richer data; any other
// plant becomes a "custom species" built from the planner's data, so nothing gets dropped.
import { CATALOG } from './catalog.js';

export function isPlannerPlan(obj) {
  return !!obj && (obj.format === 'baystate-bloom-plan' || (Array.isArray(obj.placements) && obj.width > 0 && Array.isArray(obj.cells)));
}

const SUN = (v) => {
  const s = String(v || '').toLowerCase();
  if (s.includes('part') || s.includes('partial') || s.includes('dappled')) return 'part_shade';
  if (s.includes('shade')) return 'shade';
  return 'full_sun';
};
// A grid cell gets one level; a plant's tolerance gets a range.
const CELL_MOISTURE = (v) => {
  const s = String(v || '').toLowerCase();
  if (s.includes('wet') && (s.includes('mesic') || s.includes('moist'))) return 'wet_mesic';
  if (s.includes('dry') && (s.includes('mesic') || s.includes('moist'))) return 'dry_mesic';
  if (s.includes('wet') || s.includes('saturated') || s.includes('flood')) return 'wet';
  if (s.includes('dry') || s.includes('xeric')) return 'dry';
  return 'mesic'; // Moist / Medium / Average
};
const TOLERANCE = {
  dry: ['dry', 'dry_mesic'],
  mesic: ['dry_mesic', 'mesic', 'wet_mesic'],
  wet: ['wet_mesic', 'wet'],
  dry_mesic: ['dry', 'dry_mesic', 'mesic'],
  wet_mesic: ['mesic', 'wet_mesic', 'wet'],
};

const norm = (s) => String(s || '').toLowerCase().replace(/\s+(var\.|ssp\.|subsp\.).*$/, '').replace(/[^a-z ]/g, '').trim();
const BY_SCI = new Map(CATALOG.map((p) => [norm(p.scientific), p]));

const LOOKS_FOR_FLOWERS = ['daisy', 'cluster', 'pom', 'spike', 'umbel', 'bell'];
const DEFAULTS = {
  perennial: { type: 'flower', life: 8, label: '5–10 years', speed: 'medium', first: 0.7, height: 2.5 },
  grass: { type: 'grass', life: 12, label: '10+ years', speed: 'medium', first: 0.65, height: 3 },
  fern: { type: 'fern', life: 25, label: 'decades', speed: 'medium', first: 0.65, height: 2 },
  shrub: { type: 'shrub', life: 30, label: 'decades', speed: 'slow', first: 0.45, height: 6 },
};

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function maxFeet(text, fallback) {
  const nums = String(text || '').match(/\d+(\.\d+)?/g);
  return nums ? Math.max(...nums.map(Number)) : fallback;
}

/** Plant info from a planner placement (raw project has plantSnapshot; exported plan has it flattened). */
function plantInfo(pl) {
  const s = pl.plantSnapshot || pl;
  return {
    id: String(pl.plantId ?? s.id ?? pl.uid),
    name: s.name || s.commonNames?.[0] || s.sci || 'Native plant',
    sci: s.sci || s.scientific || '',
    category: DEFAULTS[s.category] ? s.category : 'perennial',
    spreadFt: Number(s.spreadFt) > 0 ? Number(s.spreadFt) : 2,
    heightFt: s.heightFt,
    bloomMonths: Array.isArray(s.bloomMonths) ? s.bloomMonths : [],
    color: s.color || '#C48AE0',
    accent: s.accentColor || '#F7C948',
    light: (s.lightRequirements?.length ? s.lightRequirements : s.sun) || s.light || [],
    moisture: (s.soilMoisture?.length ? s.soilMoisture : s.moisture) || [],
    tip: s.careTip || s.benefit || s.description || '',
  };
}

function customSpecies(info) {
  const d = DEFAULTS[info.category];
  const moist = [...new Set((info.moisture.length ? info.moisture : ['Moist']).flatMap((m) => TOLERANCE[CELL_MOISTURE(m)]))];
  const kind =
    info.category === 'grass' ? 'grass' : info.category === 'fern' ? 'fern' : info.category === 'shrub' ? 'bush' : LOOKS_FOR_FLOWERS[hash(info.sci || info.name) % LOOKS_FOR_FLOWERS.length];
  return {
    id: 'planner:' + info.id,
    common: info.name,
    scientific: info.sci || info.name,
    type: d.type,
    sun: [...new Set((info.light.length ? info.light : ['Sun', 'Part Shade']).map(SUN))],
    moisture: moist,
    height_cm: Math.round(maxFeet(info.heightFt, d.height) * 30.48),
    spread_cm: Math.round(info.spreadFt * 30.48),
    bloom: info.bloomMonths,
    lifespan_years: d.life,
    lifespan_label: d.label,
    growth: { speed: d.speed, first_season: d.first },
    look: kind === 'bush' ? { kind, c1: info.color, c2: '#5E9A4E' } : { kind, c1: info.color, c2: info.accent },
    note: String(info.tip).replace(/^FloraAPI maintenance:\s*/i, '').slice(0, 140),
    source: 'planner',
  };
}

/** Convert a planner plan → this app's plan (see PLAN_FORMAT.md). */
export function convertPlannerPlan(src) {
  const width = Math.round(src.width);
  const length = Math.round(src.height);
  const cells = Array.from({ length }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const c = src.cells?.[y]?.[x] || {};
      return { sun: SUN(c.sun), moisture: CELL_MOISTURE(c.moisture) };
    }),
  );

  const species = new Map();
  const plants = (src.placements || src.plants || []).map((pl, i) => {
    const info = plantInfo(pl);
    const match = BY_SCI.get(norm(info.sci));
    let speciesId;
    if (match) speciesId = match.id;
    else {
      const sp = customSpecies(info);
      species.set(sp.id, sp);
      speciesId = sp.id;
    }
    // Keep the planner's footprint so plants land exactly where the gardener put them.
    const size = Math.max(1, Math.min(Math.ceil(info.spreadFt - 0.01), width, length));
    const x = Math.max(0, Math.min(width - size, Math.round(Number(pl.cx) - size / 2)));
    const y = Math.max(0, Math.min(length - size, Math.round(Number(pl.cy) - size / 2)));
    return { id: String(pl.uid || 'p' + (i + 1)), species: speciesId, x, y, size };
  });

  return {
    version: 1,
    name: src.name || 'My garden',
    zone: src.zone,
    zip: src.zip,
    width_ft: width,
    length_ft: length,
    cell_ft: 1,
    cells,
    plants,
    species: [...species.values()],
    sensors: demoStakes(cells),
    source: { app: 'planner', id: src.id, url: src.return_url || null },
  };
}

/** Two simulated sensor stakes for the demo: one in the driest area, one in the wettest. */
function demoStakes(cells) {
  const order = ['dry', 'dry_mesic', 'mesic', 'wet_mesic', 'wet'];
  const pts = cells.flatMap((row, y) => row.map((c, x) => ({ x, y, m: order.indexOf(c.moisture) })));
  if (!pts.length) return [];
  const centroid = (list) => {
    const cx = list.reduce((a, p) => a + p.x, 0) / list.length;
    const cy = list.reduce((a, p) => a + p.y, 0) / list.length;
    return list.reduce((best, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? p : best));
  };
  const minM = Math.min(...pts.map((p) => p.m));
  const maxM = Math.max(...pts.map((p) => p.m));
  const radius = Math.max(2, Math.round(Math.min(cells.length, cells[0].length) / 4));
  const stakes = [{ id: 'stake-1', name: minM <= 1 ? 'Dry-bed stake' : 'Sensor stake 1', ...pick(centroid(pts.filter((p) => p.m === minM))), radius }];
  if (maxM > minM) stakes.push({ id: 'stake-2', name: maxM >= 3 ? 'Wet-bed stake' : 'Sensor stake 2', ...pick(centroid(pts.filter((p) => p.m === maxM))), radius });
  return stakes;
}
const pick = (p) => ({ x: p.x, y: p.y });

// ---- Hand-off through the link: https://<garden>/#plan=<base64url JSON>
export function readPlanFromHash() {
  const m = (typeof location !== 'undefined' ? location.hash : '').match(/[#&]plan=([^&]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { error: 'The plan link looks damaged. Try “Open in My Garden” again, or download the plan file.' };
  }
}

export function clearHash() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    /* ignore */
  }
}
