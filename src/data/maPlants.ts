import type {
  FloraSearchResult,
  GardenProject,
  GridCell,
  MaintenanceTask,
  MAZone,
  MoistureLevel,
  NativePlant,
  PlantCategory,
  PlantPlacement,
  SunLevel,
} from '../types/garden';

export const DEFAULT_LIGHT_CATEGORIES: SunLevel[] = ['Sun', 'Part Shade', 'Shade'];
export const DEFAULT_MOISTURE_CATEGORIES: MoistureLevel[] = ['Dry', 'Moist', 'Wet'];

interface ApiFloraPlant {
  id: string;
  scientific_name: string;
  common_names: string[];
  family_name: string;
  genus_name: string;
  nativity: 'Native';
  usda_symbol?: string;
  photo_url?: string | null;
  photo_attribution?: string | null;
  photo_license?: string | null;
  photo_source_url?: string | null;
  light_requirements?: string[];
  soil_moisture?: string[];
  water_use?: string[];
  hardiness_zone_min?: string | null;
  hardiness_zone_max?: string | null;
  bloom_months?: string[];
  plant_habits?: string[];
  description?: string | null;
  habitat?: string | null;
  maintenance_tasks?: string[];
  size?: {
    height_min_ft: number | null;
    height_max_ft: number | null;
    spread_min_ft: number | null;
    spread_max_ft: number | null;
  } | null;
}

interface ApiFloraResponse {
  configured?: boolean;
  total_count?: number;
  offset?: number;
  has_more?: boolean;
  light_categories?: string[];
  moisture_categories?: string[];
  results?: ApiFloraPlant[];
  error?: string;
}

const FERN_FAMILIES = new Set([
  'polypodiaceae',
  'dryopteridaceae',
  'osmundaceae',
  'onocleaceae',
  'dennstaedtiaceae',
  'athyriaceae',
  'aspleniaceae',
  'thelypteridaceae',
  'pteridaceae',
  'blechnaceae',
  'ophioglossaceae',
]);

const GRASS_FAMILIES = new Set(['poaceae', 'cyperaceae', 'juncaceae', 'typhaceae']);

const SHRUB_FAMILIES = new Set([
  'ericaceae',
  'cornaceae',
  'aquifoliaceae',
  'viburnaceae',
  'adoxaceae',
  'caprifoliaceae',
  'betulaceae',
  'salicaceae',
  'fagaceae',
  'pinaceae',
  'cupressaceae',
  'sapindaceae',
  'aceraceae',
  'juglandaceae',
  'hamamelidaceae',
  'clethraceae',
  'myricaceae',
  'rhamnaceae',
  'lauraceae',
  'anacardiaceae',
]);

const MONTH_NAME_TO_NUM: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const NUM_TO_SHORT_MONTH: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'May',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Oct',
  11: 'Nov',
  12: 'Dec',
};

const PALETTE_COLORS = [
  ['#EC4899', '#F9A8D4'],
  ['#9333EA', '#D8B4FE'],
  ['#F97316', '#FDBA74'],
  ['#EAB308', '#FEF08A'],
  ['#EF4444', '#FCA5A5'],
  ['#3B82F6', '#93C5FD'],
  ['#10B981', '#A7F3D0'],
] as const;

function hashIndex(text: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/**
 * Parses a USDA Hardiness Zone string (e.g. "4a", "6b", "10a") into a comparable number.
 */
export function parseZoneScore(zone?: string | null): number | null {
  if (!zone) return null;
  const match = zone.trim().toLowerCase().match(/^(\d{1,2})([ab])?$/);
  if (!match) return null;
  const base = Number.parseInt(match[1], 10);
  const sub = match[2] === 'b' ? 0.5 : 0;
  return base + sub;
}

export function isZoneWithinRange(
  targetZone: MAZone,
  minZone: string | null,
  maxZone: string | null
): boolean | null {
  const target = parseZoneScore(targetZone);
  const min = parseZoneScore(minZone);
  const max = parseZoneScore(maxZone);
  if (target === null || (min === null && max === null)) return null;
  if (min !== null && target < min) return false;
  if (max !== null && target > max) return false;
  return true;
}

function formatHardinessRange(minZone: string | null, maxZone: string | null): string {
  if (minZone && maxZone) return `Zones ${minZone}–${maxZone}`;
  if (minZone) return `Zone ${minZone}+`;
  if (maxZone) return `Up to Zone ${maxZone}`;
  return 'Zones 5b–7a (MA Native)';
}

function inferCategory(raw: ApiFloraPlant): PlantCategory {
  const fam = raw.family_name.toLowerCase();
  const habits = (raw.plant_habits ?? []).join(' ').toLowerCase();
  const namesJoined = `${raw.scientific_name} ${raw.common_names.join(' ')} ${habits}`.toLowerCase();

  if (FERN_FAMILIES.has(fam) || /\bfern\b|\bbracken\b|\bpolypody\b/.test(namesJoined)) {
    return 'fern';
  }
  if (
    GRASS_FAMILIES.has(fam) ||
    /\bgraminoid\b|\bgrass\b|\bsedge\b|\brush\b|\bbluestem\b|\bpanicum\b|\bcarex\b/.test(namesJoined)
  ) {
    return 'grass';
  }
  if (
    SHRUB_FAMILIES.has(fam) ||
    /\bshrub\b|\bsubshrub\b|\btree\b|\bbush\b|\bblueberry\b|\bholly\b|\bdogwood\b|\bviburnum\b|\bpine\b|\bfir\b|\boak\b|\bmaple\b|\bbirch\b|\bwillow\b|\bcedar\b|\bspruce\b|\bhemlock\b|\balder\b|\bhazel\b|\bsumac\b|\blaurel\b|\bazalea\b|\brhododendron\b/.test(
      namesJoined
    )
  ) {
    return 'shrub';
  }
  return 'perennial';
}

function parseBloomInfo(rawMonths?: string[]): { bloom: string; bloomMonths: number[] } {
  if (!Array.isArray(rawMonths) || rawMonths.length === 0) {
    return { bloom: 'Seasonal', bloomMonths: [] };
  }
  const nums = Array.from(
    new Set(
      rawMonths
        .map((m) => MONTH_NAME_TO_NUM[m.trim().toLowerCase()])
        .filter((n): n is number => typeof n === 'number')
    )
  ).sort((a, b) => a - b);

  if (nums.length === 0) {
    return { bloom: rawMonths.join(', '), bloomMonths: [] };
  }
  if (nums.length === 1) {
    return { bloom: NUM_TO_SHORT_MONTH[nums[0]], bloomMonths: nums };
  }
  return {
    bloom: `${NUM_TO_SHORT_MONTH[nums[0]]}–${NUM_TO_SHORT_MONTH[nums[nums.length - 1]]}`,
    bloomMonths: nums,
  };
}

function formatHeightAndSpread(
  size: ApiFloraPlant['size'],
  category: PlantCategory
): { heightFt: string; spreadFt: number } {
  let heightFt =
    category === 'shrub' ? '4–10 ft' : category === 'fern' ? '1.5–3 ft' : '1.5–3.5 ft';

  if (size) {
    if (size.height_min_ft != null && size.height_max_ft != null) {
      heightFt =
        size.height_min_ft === size.height_max_ft
          ? `${size.height_max_ft} ft`
          : `${size.height_min_ft}–${size.height_max_ft} ft`;
    } else if (size.height_max_ft != null) {
      heightFt = `Up to ${size.height_max_ft} ft`;
    } else if (size.height_min_ft != null) {
      heightFt = `${size.height_min_ft}+ ft`;
    }
  }

  let spreadFt = category === 'shrub' ? 4 : 2;
  const rawSpread = size?.spread_max_ft ?? size?.spread_min_ft ?? null;
  if (typeof rawSpread === 'number' && rawSpread > 0) {
    spreadFt = Math.max(1, Math.min(8, Math.round(rawSpread)));
  }

  return { heightFt, spreadFt };
}

function buildDescriptionWithWaterUse(raw: ApiFloraPlant, waterUse: string[], hardinessRange: string): string {
  const waterSentence =
    waterUse.length > 0
      ? `Water use: ${waterUse.join(', ')}.`
      : 'Water use: Not specified by FloraAPI.';

  const parts: string[] = [waterSentence];
  if (raw.description) {
    const cleanDesc = raw.description.replace(/\s+/g, ' ').trim();
    parts.push(cleanDesc.length > 220 ? `${cleanDesc.slice(0, 217)}...` : cleanDesc);
  } else if (raw.habitat) {
    parts.push(`Native habitat: ${raw.habitat}.`);
  } else {
    parts.push(
      `Massachusetts native species in family ${raw.family_name} (${raw.genus_name}), hardy across ${hardinessRange}.`
    );
  }
  return parts.join(' ');
}

function mapApiPlantToNativePlant(raw: ApiFloraPlant): NativePlant {
  const category = inferCategory(raw);
  const [flowerColor, accent] =
    PALETTE_COLORS[hashIndex(raw.scientific_name, PALETTE_COLORS.length)];
  const primaryName = raw.common_names[0] || raw.scientific_name;

  const lightRequirements = Array.isArray(raw.light_requirements) ? raw.light_requirements : [];
  const soilMoisture = Array.isArray(raw.soil_moisture) ? raw.soil_moisture : [];
  const waterUse = Array.isArray(raw.water_use) ? raw.water_use : [];
  const hardinessZoneMin = raw.hardiness_zone_min ?? null;
  const hardinessZoneMax = raw.hardiness_zone_max ?? null;
  const hardinessRange = formatHardinessRange(hardinessZoneMin, hardinessZoneMax);

  const { bloom, bloomMonths } = parseBloomInfo(raw.bloom_months);
  const { heightFt, spreadFt } = formatHeightAndSpread(raw.size ?? null, category);
  const description = buildDescriptionWithWaterUse(raw, waterUse, hardinessRange);

  const careTip =
    raw.maintenance_tasks && raw.maintenance_tasks.length > 0
      ? `FloraAPI maintenance: ${raw.maintenance_tasks.join(', ')}.`
      : waterUse.length > 0
        ? `Water use: ${waterUse.join(', ')}. Deep-water during Year-1 establishment; leave winter stems standing for native bees.`
        : 'Deep-water during Year-1 establishment; leave winter stems standing 12–18" for native bees.';

  const allMAZones: MAZone[] = ['5b', '6a', '6b', '7a'];
  const survivingMAZones = allMAZones.filter(
    (z) => isZoneWithinRange(z, hardinessZoneMin, hardinessZoneMax) !== false
  );

  return {
    id: raw.id,
    name: primaryName,
    commonNames: raw.common_names,
    sci: raw.scientific_name,
    family: raw.family_name,
    genus: raw.genus_name,
    nativity: 'Native',
    usdaSymbol: raw.usda_symbol,
    photoUrl: raw.photo_url ?? null,
    photoAttribution: raw.photo_attribution ?? null,
    photoLicense: raw.photo_license ?? null,
    photoSourceUrl: raw.photo_source_url ?? null,
    lightRequirements,
    soilMoisture,
    waterUse,
    hardinessZoneMin,
    hardinessZoneMax,
    hardinessRange,
    description,
    habitat: raw.habitat ?? null,
    plantHabits: raw.plant_habits ?? [],
    maintenanceTasks: raw.maintenance_tasks ?? [],
    category,
    sun: lightRequirements.length > 0 ? lightRequirements : ['Sun', 'Part Shade'],
    moisture: soilMoisture.length > 0 ? soilMoisture : ['Moist'],
    spreadFt,
    heightFt,
    bloom,
    bloomMonths,
    color: category === 'fern' ? '#15803D' : category === 'grass' ? '#65A30D' : flowerColor,
    accentColor: category === 'fern' ? '#4ADE80' : category === 'grass' ? '#BEF264' : accent,
    benefit: description,
    wildlife: 'Supports native Massachusetts pollinators, butterflies, and local songbirds',
    careTip,
    zones: survivingMAZones.length > 0 ? survivingMAZones : allMAZones,
  };
}

// Live runtime registry for quick ID lookups across views
const plantRegistry = new Map<string, NativePlant>();

export function registerPlants(plants: NativePlant[]): void {
  for (const plant of plants) {
    plantRegistry.set(plant.id, plant);
  }
}

export function getRegisteredPlant(
  id: string,
  fallbackSnapshot?: NativePlant
): NativePlant | undefined {
  return plantRegistry.get(id) ?? fallbackSnapshot;
}

export interface FetchMAPlantsParams {
  q?: string;
  light?: SunLevel | 'all';
  moisture?: MoistureLevel | 'all';
  category?: PlantCategory | 'all';
  family?: string;
  genus?: string;
  limit?: number;
  offset?: number;
  hasImages?: boolean;
  signal?: AbortSignal;
}

/**
 * Fetches Massachusetts-only native plants from the backend FloraAPI proxy
 * (which queries /v1/search?state=MA&native_only=true and enriches each species
 * via GET /v1/species/{id} for light_requirements, soil_moisture, water_use, and hardiness zones).
 */
export async function fetchMassachusettsNativePlants(
  params: FetchMAPlantsParams = {}
): Promise<FloraSearchResult> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.light && params.light !== 'all') query.set('light', params.light);
  if (params.moisture && params.moisture !== 'all') query.set('moisture', params.moisture);
  if (params.category && params.category !== 'all' && params.category !== 'fern') {
    query.set('category', params.category);
  }
  if (params.category === 'fern' && !params.q?.trim()) {
    query.set('q', 'fern');
  }
  if (params.family?.trim()) query.set('family', params.family.trim());
  if (params.genus?.trim()) query.set('genus', params.genus.trim());
  query.set('limit', String(params.limit ?? 18));
  query.set('offset', String(params.offset ?? 0));
  if (params.hasImages === false) query.set('has_images', 'false');

  try {
    const res = await fetch(`/api/flora/ma-plants?${query.toString()}`, {
      signal: params.signal,
    });
    const data = (await res.json()) as ApiFloraResponse;

    if (!res.ok) {
      return {
        configured: data.configured !== false,
        plants: [],
        totalCount: 0,
        offset: params.offset ?? 0,
        hasMore: false,
        lightCategories: DEFAULT_LIGHT_CATEGORIES,
        moistureCategories: DEFAULT_MOISTURE_CATEGORIES,
        error: data.error || `Failed to load Massachusetts native plants (HTTP ${res.status}).`,
      };
    }

    const mapped = (data.results ?? []).map(mapApiPlantToNativePlant);
    const finalPlants =
      params.category === 'fern' ? mapped.filter((p) => p.category === 'fern') : mapped;

    registerPlants(finalPlants);

    return {
      configured: true,
      plants: finalPlants,
      totalCount: data.total_count ?? finalPlants.length,
      offset: data.offset ?? (params.offset ?? 0),
      hasMore: Boolean(data.has_more),
      lightCategories:
        data.light_categories && data.light_categories.length > 0
          ? data.light_categories
          : DEFAULT_LIGHT_CATEGORIES,
      moistureCategories:
        data.moisture_categories && data.moisture_categories.length > 0
          ? data.moisture_categories
          : DEFAULT_MOISTURE_CATEGORIES,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      throw err;
    }
    return {
      configured: true,
      plants: [],
      totalCount: 0,
      offset: params.offset ?? 0,
      hasMore: false,
      lightCategories: DEFAULT_LIGHT_CATEGORIES,
      moistureCategories: DEFAULT_MOISTURE_CATEGORIES,
      error: 'Unable to reach the Massachusetts plant service right now.',
    };
  }
}

export function generateTasksForProject(placements: PlantPlacement[]): MaintenanceTask[] {
  const placedMeta = placements
    .map((p) => {
      const plant = getRegisteredPlant(p.plantId, p.plantSnapshot);
      return `${plant?.name ?? ''} ${plant?.genus ?? ''} ${plant?.family ?? ''} ${(plant?.waterUse ?? []).join(' ')}`.toLowerCase();
    })
    .join(' ');

  const tasks: MaintenanceTask[] = [
    {
      id: 'spring-stems',
      season: 'Spring',
      months: 'Apr–May',
      title:
        'Cut back old hollow flower stems to 12–18" once daytime temperatures stay above 50°F to protect overwintering native cavity-nesting bees.',
      done: false,
    },
    {
      id: 'spring-weeds',
      season: 'Spring',
      months: 'Apr–May',
      title:
        'Hand-pull early invasive shoots (garlic mustard, Oriental bittersweet, crabgrass) and top-dress bare soil with 1–2" shredded leaf compost.',
      done: false,
    },
    {
      id: 'summer-water',
      season: 'Summer',
      months: 'Jun–Aug',
      title:
        'Year 1 Establishment: Deep-water newly planted natives 1 inch per week during dry Massachusetts summer spells; avoid synthetic pesticides.',
      done: false,
    },
    {
      id: 'fall-seeds',
      season: 'Fall',
      months: 'Sep–Nov',
      title:
        'Leave standing seed heads intact through autumn for migrating Massachusetts songbirds and goldfinches.',
      done: false,
    },
    {
      id: 'winter-leaves',
      season: 'Winter',
      months: 'Dec–Mar',
      title:
        'Leave fallen oak and maple leaves inside garden beds as natural root insulation and overwintering cover for fireflies and bumblebee queens.',
      done: false,
    },
  ];

  if (placedMeta.includes('asclepias') || placedMeta.includes('milkweed')) {
    tasks.push({
      id: 'summer-monarch',
      season: 'Summer',
      months: 'Jul–Aug',
      title:
        'Inspect Milkweed (Asclepias) leaves for monarch eggs and caterpillars; let ladybugs and lacewings manage aphids naturally without sprays.',
      done: false,
      plantRelated: 'Asclepias / Milkweed',
    });
  }

  if (placedMeta.includes('high')) {
    tasks.push({
      id: 'summer-high-water',
      season: 'Summer',
      months: 'Jul–Aug',
      title:
        'Monitor High water-use native plantings during dry stretches so moist and wet soil zones stay evenly hydrated.',
      done: false,
      plantRelated: 'High Water-Use Natives',
    });
  }

  if (
    placedMeta.includes('vaccinium') ||
    placedMeta.includes('blueberry') ||
    placedMeta.includes('ericaceae')
  ) {
    tasks.push({
      id: 'spring-acid',
      season: 'Spring',
      months: 'Apr',
      title:
        'Refresh pine-needle or oak-leaf mulch around Ericaceae shrubs to preserve naturally acidic Massachusetts soil (pH 4.5–5.5).',
      done: false,
      plantRelated: 'Ericaceae',
    });
  }

  return tasks;
}

export function createStarterGarden(
  zone: MAZone = '6a',
  livePlants: NativePlant[] = []
): GardenProject {
  const width = 12;
  const height = 8;

  const cells: GridCell[][] = Array.from({ length: height }, (_, r) =>
    Array.from({ length: width }, (_, c) => {
      if (c < 5) {
        return { sun: 'Sun', moisture: r >= 5 ? 'Dry' : 'Moist' };
      }
      if (c < 8) {
        return { sun: r < 3 ? 'Part Shade' : 'Sun', moisture: 'Wet' };
      }
      return { sun: c >= 10 ? 'Shade' : 'Part Shade', moisture: r < 4 ? 'Moist' : 'Dry' };
    })
  );

  const coords = [
    { cx: 2, cy: 2 },
    { cx: 2, cy: 6 },
    { cx: 6, cy: 2 },
    { cx: 6, cy: 6 },
    { cx: 10, cy: 2 },
    { cx: 10, cy: 6 },
  ];

  const placements: PlantPlacement[] = livePlants.slice(0, coords.length).map((plant, idx) => ({
    uid: `starter_${idx + 1}_${Date.now()}`,
    plantId: plant.id,
    cx: coords[idx].cx,
    cy: coords[idx].cy,
    plantSnapshot: plant,
  }));

  return {
    id: 'g_starter_' + Date.now(),
    name: 'Concord Pollinator & Rain Border',
    zone,
    width,
    height,
    cells,
    placements,
    completed: false,
    createdAt: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    tasks: generateTasksForProject(placements),
    logs: [
      {
        id: 'log_init_1',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        plant: 'Whole Garden',
        action: 'Mapped Light & Soil Moisture',
        notes: 'Mapped Sun, Part Shade, and Shade alongside Dry, Moist, and Wet zones.',
      },
    ],
  };
}
