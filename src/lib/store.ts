'use client';

import { createContext, useContext } from 'react';
import type { MemberData, Member, ChannelName, SegmentTab } from '@/types';

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
  businessInsightsOpen: boolean;
  setBusinessInsightsOpen: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  chatSeedPrompt: string | null;
  openChatWithContext: (prompt: string) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  scrollToTable: () => void;
  tableAnchorRef: React.RefObject<HTMLDivElement | null> | null;
  persistStateForNavigation: () => void;
}

export interface FilterState {
  search: string;
  segments: string[];
  segmentTab: SegmentTab;
  channels: ChannelName[];
  channelMode: 'any' | 'all';
  spendMin: number | null;
  spendMax: number | null;
  gender: string;
  riskOnly: boolean;
  buyingOnly: boolean;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export const defaultFilters: FilterState = {
  search: '',
  segments: [],
  segmentTab: 'general',
  channels: [],
  channelMode: 'any',
  spendMin: null,
  spendMax: null,
  gender: '',
  riskOnly: false,
  buyingOnly: false,
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
  businessInsightsOpen: false,
  setBusinessInsightsOpen: () => {},
  chatOpen: false,
  setChatOpen: () => {},
  chatSeedPrompt: null,
  openChatWithContext: () => {},
  view: 'dashboard',
  setView: () => {},
  filters: defaultFilters,
  setFilters: () => {},
  scrollToTable: () => {},
  tableAnchorRef: null,
  persistStateForNavigation: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
