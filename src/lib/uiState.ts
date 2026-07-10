import type { FilterState, ViewMode } from './store';

const KEY = 'd360_dashboard_state';

interface SavedState {
  filters: FilterState;
  view: ViewMode;
}

export function saveDashboardState(filters: FilterState, view: ViewMode) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ filters, view }));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

export function loadDashboardState(): SavedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
