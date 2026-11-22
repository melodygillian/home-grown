// Serves our 54 Massachusetts native plants in the same shape as the FloraAPI proxy,
// so the planner works without a FloraAPI key (or when FloraAPI is down).
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const catalog = require('../src/data/ma-native-plants.json');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LIGHT = { full_sun: 'Sun', part_shade: 'Part Shade', shade: 'Shade' };
const MOIST = { dry: 'Dry', dry_mesic: 'Dry', mesic: 'Moist', wet_mesic: 'Wet', wet: 'Wet' };
const HABIT = { flower: 'Forb/herb', groundcover: 'Forb/herb', grass: 'Graminoid', fern: 'Fern', shrub: 'Shrub' };
const FAMILY = { fern: 'Dryopteridaceae', grass: 'Poaceae' };
const uniq = (a) => [...new Set(a)];

function toFlora(p) {
  return {
    id: p.id,
    scientific_name: p.scientific,
    common_names: [p.common],
    family_name: FAMILY[p.type] || 'Native plant',
    genus_name: p.scientific.split(' ')[0],
    nativity: 'Native',
    photo_url: null,
    photo_attribution: null,
    photo_license: null,
    photo_source_url: null,
    light_requirements: uniq(p.sun.map((s) => LIGHT[s])),
    soil_moisture: uniq(p.moisture.map((m) => MOIST[m])),
    water_use: [],
    hardiness_zone_min: '4a',
    hardiness_zone_max: '8a',
    bloom_months: (p.bloom || []).map((m) => MONTHS[m - 1]),
    plant_habits: [HABIT[p.type] || 'Forb/herb'],
    description: p.note,
    habitat: null,
    maintenance_tasks: [],
    size: {
      height_min_ft: null,
      height_max_ft: Math.round((p.height_cm / 30.48) * 10) / 10,
      spread_min_ft: null,
      spread_max_ft: Math.max(1, Math.round(p.spread_cm / 30.48)),
    },
  };
}

const ALL = catalog.plants.map(toFlora);

export function localSearch(query = {}) {
  const q = String(query.q || '').trim().toLowerCase();
  const light = String(query.light || '').toLowerCase();
  const moisture = String(query.moisture || '').toLowerCase();
  const category = String(query.category || '').toLowerCase();
  const limit = Math.min(36, Math.max(1, parseInt(query.limit || '18', 10) || 18));
  const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);
  const habit = { perennial: 'Forb/herb', grass: 'Graminoid', shrub: 'Shrub' }[category];
  let list = ALL.filter((p) => {
    if (q && !`${p.scientific_name} ${p.common_names.join(' ')} ${p.plant_habits.join(' ')}`.toLowerCase().includes(q)) return false;
    if (light && light !== 'all' && !p.light_requirements.some((l) => l.toLowerCase() === light)) return false;
    if (moisture && moisture !== 'all' && !p.soil_moisture.some((m) => m.toLowerCase() === moisture)) return false;
    if (habit && !p.plant_habits.includes(habit)) return false;
    return true;
  });
  const total = list.length;
  list = list.slice(offset, offset + limit);
  return {
    configured: true,
    source: 'local',
    state: 'MA',
    native_only: true,
    total_count: total,
    page_size: list.length,
    offset,
    has_more: offset + list.length < total,
    light_categories: ['Sun', 'Part Shade', 'Shade'],
    moisture_categories: ['Dry', 'Moist', 'Wet'],
    results: list,
  };
}

export function localSpecies(id) {
  return ALL.find((p) => p.id === id) || null;
}
