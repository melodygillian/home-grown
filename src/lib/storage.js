// Saves the garden in this browser (localStorage) so it survives a refresh.
// For a real product this would be a database; for a hackathon demo this is enough.
const KEY = 'smartGarden:v1';

// If your teammate's planning page runs on the same website, it can hand over the plan by
// saving it here: localStorage.setItem('gardenPlan', JSON.stringify(plan))
export const HANDOFF_KEY = 'gardenPlan';

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: ignore */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function readHandoffPlan() {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
