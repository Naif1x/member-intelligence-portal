'use client';

import { createContext, useContext } from 'react';
import type { MemberData, Member, ChannelName } from '@/types';

export type ViewMode = 'dashboard' | 'members' | 'segments' | 'campaigns';

export interface AppState {
  data: MemberData | null;
  loading: boolean;
  selectedMember: Member | null;
  setSelectedMember: (m: Member | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatSeedPrompt: string | null;
  openChatWithContext: (prompt: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  filtersOpen: boolean;
  setFiltersOpen: (v: boolean) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  scrollToTable: () => void;
  tableAnchorRef: React.RefObject<HTMLDivElement | null> | null;
  persistStateForNavigation: () => void;
}

export interface FilterState {
  search: string;
  segment: string;
  channel: ChannelName | '';
  riskOnly: boolean;
  buyingOnly: boolean;
  recencyScore: number | null;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const defaultFilters: FilterState = {
  search: '',
  segment: '',
  channel: '',
  riskOnly: false,
  buyingOnly: false,
  recencyScore: null,
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
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
  rightPanelOpen: false,
  setRightPanelOpen: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  chatSeedPrompt: null,
  openChatWithContext: () => {},
  view: 'dashboard',
  setView: () => {},
  filtersOpen: false,
  setFiltersOpen: () => {},
  filters: defaultFilters,
  setFilters: () => {},
  scrollToTable: () => {},
  tableAnchorRef: null,
  persistStateForNavigation: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
