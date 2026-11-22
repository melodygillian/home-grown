// Track My Garden: growth, status, simulated sensors and weather context for a planned garden.
// The map always comes from the garden plan (project.placements), so what you track is exactly
// what you designed. Growth/lifespan details come from our Massachusetts catalog when the
// species matches, otherwise from sensible defaults for the plant's category.
import catalogData from '../data/ma-native-plants.json';
import {
  expectedScore,
  statusOf,
  cameraLogs,
  baseScoreOf,
  daysSince,
  START_PCT,
} from '../lib/growth.js';
import { getRegisteredPlant } from '../data/maPlants';
import type { GardenProject, GardenTracking, GrowthLog, NativePlant, PlantPlacement } from '../types/garden';

export const EMPTY_TRACKING: GardenTracking = { plants: {}, empty: [], journal: [] };

export function trackingOf(project: GardenProject): GardenTracking {
  const t = project.tracking;
  return { ...EMPTY_TRACKING, ...(t || {}), plants: t?.plants || {}, empty: t?.empty || [], journal: t?.journal || [] };
}

// ---------- species growth info ----------
export interface TrackSpecies {
  id: string;
  common: string;
  scientific: string;
  type: string;
  height_cm: number;
  growth: { speed: 'fast' | 'medium' | 'slow'; first_season: number };
  lifespan_years: number;
  lifespan_label: string;
  bloom: number[];
  likes: string[]; // our 5-level moisture scale
}

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .replace(/\s+(var\.|ssp\.|subsp\.).*$/, '')
    .replace(/[^a-z ]/g, '')
    .trim();
const CATALOG: any[] = (catalogData as any).plants;
const BY_SCI = new Map(CATALOG.map((p) => [norm(p.scientific), p]));

const DEFAULTS: Record<string, { life: number; label: string; speed: 'fast' | 'medium' | 'slow'; first: number; ft: number }> = {
  perennial: { life: 8, label: '5–10 years', speed: 'medium', first: 0.7, ft: 2.5 },
  grass: { life: 12, label: '10+ years', speed: 'medium', first: 0.65, ft: 3 },
  fern: { life: 25, label: 'decades', speed: 'medium', first: 0.65, ft: 2 },
  shrub: { life: 30, label: 'decades', speed: 'slow', first: 0.45, ft: 6 },
};
const MOIST3 = (m: string): string[] => {
  const s = m.toLowerCase();
  if (s.includes('wet')) return ['wet_mesic', 'wet'];
  if (s.includes('dry')) return ['dry', 'dry_mesic'];
  return ['dry_mesic', 'mesic', 'wet_mesic'];
};
const maxFeet = (text: string, fallback: number) => {
  const nums = String(text || '').match(/\d+(\.\d+)?/g);
  return nums ? Math.max(...nums.map(Number)) : fallback;
};

export function speciesFor(plant: NativePlant): TrackSpecies {
  const match = BY_SCI.get(norm(plant.sci));
  if (match) {
    return {
      id: match.id,
      common: plant.name,
      scientific: plant.sci,
      type: match.type,
      height_cm: match.height_cm,
      growth: match.growth,
      lifespan_years: match.lifespan_years,
      lifespan_label: match.lifespan_label,
      bloom: plant.bloomMonths?.length ? plant.bloomMonths : match.bloom,
      likes: match.moisture,
    };
  }
  const d = DEFAULTS[plant.category] || DEFAULTS.perennial;
  const moist = plant.soilMoisture?.length ? plant.soilMoisture : plant.moisture;
  return {
    id: plant.id,
    common: plant.name,
    scientific: plant.sci,
    type: plant.category === 'perennial' ? 'flower' : plant.category,
    height_cm: Math.round(maxFeet(plant.heightFt, d.ft) * 30.48),
    growth: { speed: d.speed, first_season: d.first },
    lifespan_years: d.life,
    lifespan_label: d.label,
    bloom: plant.bloomMonths || [],
    likes: [...new Set((moist?.length ? moist : ['Moist']).flatMap(MOIST3))],
  };
}

// ---------- simulated sensor stakes (demo) ----------
export interface Stake {
  id: string;
  name: string;
  x: number; // feet
  y: number;
  radius: number; // feet
}

export function stakesFor(project: GardenProject): Stake[] {
  const pts: { x: number; y: number; m: number }[] = [];
  const rank = (m: string) => (/wet/i.test(m) ? 2 : /dry/i.test(m) ? 0 : 1);
  project.cells.forEach((row, y) => row.forEach((c, x) => pts.push({ x: x + 0.5, y: y + 0.5, m: rank(c.moisture) })));
  if (!pts.length) return [];
  const centroid = (list: typeof pts) => {
    const cx = list.reduce((a, p) => a + p.x, 0) / list.length;
    const cy = list.reduce((a, p) => a + p.y, 0) / list.length;
    return list.reduce((b, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(b.x - cx, b.y - cy) ? p : b));
  };
  const lo = Math.min(...pts.map((p) => p.m));
  const hi = Math.max(...pts.map((p) => p.m));
  const radius = Math.max(2.5, Math.min(project.width, project.height) / 3);
  const a = centroid(pts.filter((p) => p.m === lo));
  const stakes: Stake[] = [{ id: 'stake-1', name: lo === 0 ? 'Dry-bed sensor' : 'Sensor 1', x: a.x, y: a.y, radius }];
  if (hi > lo) {
    const b = centroid(pts.filter((p) => p.m === hi));
    stakes.push({ id: 'stake-2', name: hi === 2 ? 'Wet-bed sensor' : 'Sensor 2', x: b.x, y: b.y, radius });
  }
  return stakes;
}

export function stakeFor(stakes: Stake[], p: { cx: number; cy: number }) {
  return stakes.find((s) => Math.hypot(s.x - p.cx, s.y - p.cy) <= s.radius) || null;
}

export function cellAt(project: GardenProject, cx: number, cy: number) {
  const col = Math.min(project.width - 1, Math.max(0, Math.floor(cx)));
  const row = Math.min(project.height - 1, Math.max(0, Math.floor(cy)));
  return project.cells[row]?.[col] || { sun: 'Sun', moisture: 'Moist' };
}

const BASE_MOISTURE = (m: string) => (/wet/i.test(m) ? 56 : /dry/i.test(m) ? 20 : 36);
const SUN_HOURS = (s: string) => (/part/i.test(s) ? 5.1 : /shade/i.test(s) ? 2.6 : 8.3);

export function readingsFor(project: GardenProject, p: PlantPlacement, today: any, now = Date.now()) {
  const cell = cellAt(project, p.cx, p.cy);
  const wobble = Math.sin(now / 600000 + (p.cx * 7 + p.cy * 3)) * 1.5;
  let moisture = BASE_MOISTURE(cell.moisture);
  let temp = 68;
  let sun = SUN_HOURS(cell.sun);
  if (today) {
    if (today.hi > 75) moisture -= (today.hi - 75) * 0.35;
    if (today.pop >= 60) moisture += 10;
    if (today.hi != null) temp = Math.round((today.hi + (today.lo ?? today.hi - 15)) / 2 - 2);
    if (today.pop >= 60 || /cloud|rain|snow|showers/i.test(today.short || '')) sun *= 0.55;
  }
  return {
    moisture: Math.max(4, Math.min(70, Math.round(moisture + wobble))),
    soilTempF: temp,
    sunHours: Math.round(sun * 10) / 10,
  };
}

// ---------- per-plant derived state ----------
export interface PlantState {
  placement: PlantPlacement;
  plant: NativePlant;
  species: TrackSpecies;
  status: 'planned' | 'thriving' | 'ontrack' | 'attention' | 'risk';
  planted: boolean;
  today: number; // days since planting
  logs: GrowthLog[];
  base: number;
  stake: Stake | null;
  cell: { sun: string; moisture: string };
}

export function plantStates(project: GardenProject, now = Date.now()): PlantState[] {
  const t = trackingOf(project);
  const stakes = stakesFor(project);
  return project.placements
    .map((placement) => {
      const plant = getRegisteredPlant(placement.plantId, placement.plantSnapshot);
      if (!plant) return null;
      const species = speciesFor(plant);
      const track = t.plants[placement.uid];
      const stake = stakeFor(stakes, placement);
      const cell = cellAt(project, placement.cx, placement.cy);
      if (!track) {
        return { placement, plant, species, status: 'planned', planted: false, today: 0, logs: [], base: START_PCT, stake, cell } as PlantState;
      }
      const today = daysSince(track.plantedOn, now);
      const notes = track.logs || [];
      const base = stake ? START_PCT : baseScoreOf(notes);
      const logs: GrowthLog[] = stake
        ? (cameraLogs({ id: placement.uid, plantedOn: track.plantedOn }, species, now) as GrowthLog[])
        : notes.length && notes[0].day === 0
          ? notes
          : [{ day: 0, score: Math.round(base), source: 'start' }, ...notes];
      const status = statusOf({ status: 'planted', logs, base }, species);
      return { placement, plant, species, status, planted: true, today, logs, base, stake, cell } as PlantState;
    })
    .filter(Boolean) as PlantState[];
}

/** What the weather rules need to know about the planted garden. */
export function weatherContext(states: PlantState[]) {
  const SUN: Record<string, string> = { sun: 'full_sun', 'part shade': 'part_shade', shade: 'shade' };
  return {
    planted: states
      .filter((s) => s.planted)
      .map((s) => ({
        id: s.placement.uid,
        common: s.plant.name,
        likes: s.species.likes,
        sunAt: SUN[s.cell.sun.toLowerCase()] || 'full_sun',
        moistureAt: s.cell.moisture,
        daysSincePlanted: s.today,
        heightCm: s.species.height_cm,
      })),
  };
}

export { expectedScore };
