'use client';

import { createContext, useContext } from 'react';
import type { MemberData, Member } from '@/types';

export interface AppState {
  data: MemberData | null;
  loading: boolean;
  selectedMember: Member | null;
  setSelectedMember: (m: Member | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
}

export interface FilterState {
  search: string;
  segment: string;
  channel: string;
  riskOnly: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const defaultFilters: FilterState = {
  search: '',
  segment: '',
  channel: '',
  riskOnly: false,
  sortBy: 'total_spend',
  sortDir: 'desc',
};

export const AppContext = createContext<AppState>({
  data: null,
  loading: true,
  selectedMember: null,
  setSelectedMember: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  rightPanelOpen: false,
  setRightPanelOpen: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  filters: defaultFilters,
  setFilters: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
