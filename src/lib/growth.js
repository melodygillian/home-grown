// Expected growth, growth score and health status.
//
// Growth score = how big and healthy the plant is compared with a fully grown, healthy plant (100).
// When Gemini reads a check-in, it gives the score itself (growth_score), judging the plant against
// a normal, healthy plant of the same species at the same age. If Gemini isn't available, the score
// is estimated from height, leaf color, flowers, problems and the gardener's overall impression.

const DAY = 24 * 60 * 60 * 1000;
export const START_PCT = 30; // a nursery-pot plant is roughly 30% of its mature height

/** Today's date as YYYY-MM-DD in the gardener's own time zone (not UTC). */
export function localIso(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days between a YYYY-MM-DD date and today, in local time. */
export function daysSince(iso, now = Date.now()) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const n = new Date(now);
  const today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.max(0, Math.round((today - then) / DAY));
}

/**
 * Expected growth score `t` days after planting (first growing season, ~120 days).
 * `base` = the plant's starting score. Normally a small nursery plant (30), but if the
 * gardener's first check-in shows a bigger plant, the curve starts from that instead.
 */
export function expectedScore(species, t, base = START_PCT) {
  const end0 = Math.round((species.growth?.first_season ?? 0.7) * 100);
  const gain = (end0 - START_PCT) * Math.max(0.08, Math.min(1, (125 - base) / 95));
  const end = base + gain;
  const k = species.growth?.speed === 'fast' ? 0.075 : species.growth?.speed === 'slow' ? 0.045 : 0.06;
  const mid = 55;
  const raw = (x) => 1 / (1 + Math.exp(-k * (x - mid)));
  const f = (raw(Math.min(t, 150)) - raw(0)) / (raw(150) - raw(0));
  return base + (end - base) * f;
}

/** Turn a check-in reading into a growth score. */
export function scoreFromFeatures(species, features, previousHeightPct, expected) {
  const hasHeight = features.height_cm != null && features.height_cm > 0;
  const heightPct = hasHeight ? (features.height_cm / species.height_cm) * 100 : null;

  // 1) Gemini's own judgment against a normal, healthy plant of this species and age.
  if (Number.isFinite(features.growth_score)) {
    return { score: Math.max(3, Math.min(130, Math.round(features.growth_score))), heightPct: heightPct ?? previousHeightPct ?? null };
  }

  // 2) Backup estimate when Gemini isn't available.
  const size = heightPct ?? previousHeightPct ?? expected;
  const CONDITION = { excellent: 1.08, good: 1.0, fair: 0.9, poor: 0.78, dying: 0.45 };
  const mult = CONDITION[features.overall_condition] ?? 1;
  let adj = 0;
  if (features.leaf_color === 'healthy_green') adj += 2;
  if (features.leaf_color === 'pale_or_yellowing') adj -= 8;
  if (features.leaf_color === 'browning') adj -= 12;
  if (features.wilting) adj -= 12;
  if (features.pest_damage) adj -= 8;
  if (features.disease_signs) adj -= 10;
  if (features.flowering === 'blooming' || features.flowering === 'buds') adj += 3;
  if (features.new_growth) adj += 3;
  adj -= 6 * Math.min(3, (features.concerns || []).length);
  return {
    score: Math.max(3, Math.min(130, Math.round(size * mult + adj))),
    heightPct: heightPct ?? previousHeightPct ?? null,
  };
}

export const STATUS = {
  thriving: { label: 'Thriving', ring: '#2E8B3E', glow: 'rgba(46,139,62,0.40)', bg: '#D9F2DD', fg: '#165A24' },
  ontrack: { label: 'On track', ring: '#4A90D9', glow: 'rgba(74,144,217,0.36)', bg: '#DCEBFA', fg: '#1C4C80' },
  attention: { label: 'Needs attention', ring: '#F0A030', glow: 'rgba(240,160,48,0.45)', bg: '#FFEBCC', fg: '#7A4300' },
  risk: { label: 'At risk', ring: '#C62828', glow: 'rgba(198,40,40,0.38)', bg: '#FBD9D7', fg: '#8E1B1B' },
  planned: { label: 'Planned · not planted yet', ring: '#9C978B', glow: 'transparent', bg: '#EEECE6', fg: '#4F4B42' },
  removed: { label: 'Empty spot', ring: '#9C978B', glow: 'transparent', bg: '#EEECE6', fg: '#4F4B42' },
};

/** Starting score: the first check-in within a week of planting, otherwise a typical nursery plant. */
export function baseScoreOf(logs) {
  const first = (logs || []).find((l) => l.source === 'note' && l.day <= 7);
  return first ? first.score : START_PCT;
}

export function statusOf(plant, species) {
  if (plant.status !== 'planted') return plant.status; // 'planned' | 'removed'
  const last = plant.logs?.[plant.logs.length - 1];
  if (!last) return 'ontrack';
  const r = last.score / expectedScore(species, last.day, plant.base ?? START_PCT);
  let st = r >= 1.08 ? 'thriving' : r >= 0.9 ? 'ontrack' : r >= 0.75 ? 'attention' : 'risk';
  const f = last.features || {};
  const serious = (f.wilting ? 1 : 0) + (f.disease_signs ? 1 : 0) + (f.leaf_color === 'browning' ? 1 : 0) + (f.pest_damage ? 1 : 0);
  const abnormal = f.matches_normal === false || (f.concerns || []).length > 0;
  if (serious >= 2 || f.overall_condition === 'dying' || (f.overall_condition === 'poor' && serious >= 1)) st = 'risk';
  else if ((serious === 1 || f.overall_condition === 'poor' || abnormal) && (st === 'thriving' || st === 'ontrack')) st = 'attention';
  else if (f.overall_condition === 'fair' && st === 'thriving') st = 'ontrack';
  return st;
}

/** Small stable pseudo-random number from a string, so fake data stays the same between reloads. */
export function hashUnit(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/** Simulated stake-camera history: one reading a week since planting. */
export function cameraLogs(plant, species, now = Date.now()) {
  const days = daysSince(plant.plantedOn, now);
  const vigor = 0.84 + hashUnit(plant.id + species.id) * 0.3; // 0.84 – 1.14
  const logs = [];
  for (let d = 0; d <= days; d += 7) logs.push(cameraPoint(species, d, vigor));
  if (days % 7 !== 0) logs.push(cameraPoint(species, days, vigor));
  return logs;
}

function cameraPoint(species, day, vigor) {
  const exp = expectedScore(species, day);
  const ramp = Math.min(day / 60, 1);
  const score = Math.round(exp * (1 + (vigor - 1) * ramp));
  return { day, score, source: 'camera', features: { height_cm: Math.round((score / 100) * species.height_cm) } };
}
