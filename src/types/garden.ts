// FloraAPI canonical light_requirements & soil_moisture categories (extensible if FloraAPI returns additional values)
export type SunLevel = 'Sun' | 'Part Shade' | 'Shade' | (string & {});
export type MoistureLevel = 'Dry' | 'Moist' | 'Wet' | (string & {});
export type PlantCategory = 'perennial' | 'grass' | 'shrub' | 'fern';
export type MAZone = '5b' | '6a' | '6b' | '7a';
export type AppView = 'home' | 'catalog' | 'dashboard' | 'designer' | 'maintenance' | 'tracker';
export type DesignStep = 'sun' | 'moisture' | 'plants';
export type SeasonName = 'Spring' | 'Summer' | 'Fall' | 'Winter';

export interface NativePlant {
  id: string;
  name: string; // Primary common name (or scientific name if none listed)
  commonNames: string[]; // All common names from FloraAPI
  sci: string; // Scientific name from FloraAPI
  family: string; // Taxonomic family from FloraAPI
  genus: string; // Taxonomic genus from FloraAPI
  nativity: 'Native';
  usdaSymbol?: string;
  photoUrl?: string | null;
  photoAttribution?: string | null;
  photoLicense?: string | null;
  photoSourceUrl?: string | null;
  // Growing conditions from GET /v1/species/{id}
  lightRequirements: string[]; // e.g. ["Sun", "Part Shade"]
  soilMoisture: string[]; // e.g. ["Dry", "Moist", "Wet"]
  waterUse: string[]; // e.g. ["Low", "Medium", "High"]
  hardinessZoneMin: string | null; // e.g. "4a"
  hardinessZoneMax: string | null; // e.g. "8a"
  hardinessRange: string; // Formatted e.g. "Zones 4a–8a"
  description: string; // Plant description incorporating Water Use
  habitat?: string | null;
  plantHabits: string[];
  maintenanceTasks: string[];
  category: PlantCategory;
  sun: SunLevel[];
  moisture: MoistureLevel[];
  spreadFt: number;
  heightFt: string;
  bloom: string;
  bloomMonths: number[]; // 4=Apr ... 10=Oct
  color: string;
  accentColor: string;
  benefit: string;
  wildlife: string;
  careTip: string;
  zones: MAZone[];
}

export interface FloraSearchResult {
  configured: boolean;
  plants: NativePlant[];
  totalCount: number;
  offset: number;
  hasMore: boolean;
  lightCategories: string[];
  moistureCategories: string[];
  error?: string;
}

export interface GridCell {
  sun: SunLevel;
  moisture: MoistureLevel;
}

export interface PlantPlacement {
  uid: string;
  plantId: string;
  cx: number; // Center X in feet (0..width)
  cy: number; // Center Y in feet (0..height)
  plantSnapshot?: NativePlant;
}

export interface MaintenanceTask {
  id: string;
  season: SeasonName;
  months: string;
  title: string;
  done: boolean;
  plantRelated?: string;
}

export interface MaintenanceLog {
  id: string;
  date: string;
  plant: string;
  action: string;
  notes: string;
}

export interface GardenProject {
  id: string;
  name: string;
  zone: MAZone;
  width: number;
  height: number;
  cells: GridCell[][];
  placements: PlantPlacement[];
  completed: boolean;
  createdAt: string;
  tasks: MaintenanceTask[];
  logs: MaintenanceLog[];
  /** Track My Garden: what's actually in the ground and how it's growing. Saved with the garden in the user's profile. */
  tracking?: GardenTracking;
}

// ---------- Track My Garden ----------
export interface GrowthLog {
  day: number; // days since planting
  score: number; // growth score (100 = fully grown & healthy)
  heightPct?: number | null;
  source: 'start' | 'note' | 'camera';
  features?: Record<string, unknown>;
  note?: string;
}

export interface PlantTracking {
  status: 'planted';
  plantedOn: string; // YYYY-MM-DD
  logs: GrowthLog[];
  analysis?: Record<string, any> | null;
}

export interface EmptySpot {
  id: string;
  cx: number;
  cy: number;
  spreadFt: number;
  was: string; // name of the plant that was removed
}

export interface GardenJournalEntry {
  plant: string;
  sci: string;
  plantedOn: string | null;
  removedOn: string;
  reason: 'natural' | 'early';
}

export interface GardenTracking {
  zip?: string;
  place?: { city: string; state: string } | null;
  plants: Record<string, PlantTracking>; // by placement uid; missing = planned, not planted yet
  empty: EmptySpot[];
  journal: GardenJournalEntry[];
  sampleWeather?: boolean;
}

export interface UserRecord {
  email: string;
  password: string;
  displayName: string;
  projects: GardenProject[];
}

export interface ConflictDetail {
  uid: string;
  boundary: boolean;
  overlapsWith: string[];
}
