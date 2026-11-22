import type { GardenProject, GridCell, MoistureLevel, SunLevel, UserRecord } from '../types/garden';

const STORAGE_USERS_KEY = 'baystate_bloom_users_v2';
const STORAGE_SESSION_KEY = 'baystate_bloom_session_v2';

function normalizeLightValue(val: string): SunLevel {
  const lower = val.trim().toLowerCase();
  if (lower === 'full' || lower === 'full sun' || lower === 'sun') return 'Sun';
  if (lower === 'part' || lower === 'part shade' || lower === 'partial shade') return 'Part Shade';
  if (lower === 'shade' || lower === 'full shade') return 'Shade';
  return val;
}

function normalizeMoistureValue(val: string): MoistureLevel {
  const lower = val.trim().toLowerCase();
  if (lower === 'dry') return 'Dry';
  if (lower === 'average' || lower === 'moist' || lower === 'medium') return 'Moist';
  if (lower === 'wet') return 'Wet';
  return val;
}

function migrateProject(project: GardenProject): GardenProject {
  const migratedCells: GridCell[][] = project.cells.map((row) =>
    row.map((cell) => ({
      sun: normalizeLightValue(cell.sun),
      moisture: normalizeMoistureValue(cell.moisture),
    }))
  );
  return { ...project, cells: migratedCells };
}

export function loadUsers(): Record<string, UserRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, UserRecord>;
    const migrated: Record<string, UserRecord> = {};
    for (const [email, rec] of Object.entries(parsed)) {
      migrated[email] = {
        ...rec,
        projects: Array.isArray(rec.projects) ? rec.projects.map(migrateProject) : [],
      };
    }
    return migrated;
  } catch {
    return {};
  }
}

export function saveUsers(users: Record<string, UserRecord>): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadSessionEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveSessionEmail(email: string | null): void {
  try {
    if (email) {
      localStorage.setItem(STORAGE_SESSION_KEY, email);
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function persistUserProjects(email: string, projects: GardenProject[]): void {
  const users = loadUsers();
  if (!users[email]) return;
  users[email] = { ...users[email], projects };
  saveUsers(users);
}
