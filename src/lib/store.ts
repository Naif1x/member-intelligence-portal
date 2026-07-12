'use client';

import { createContext, useContext } from 'react';
import type { MemberData, Member, ChannelName, SegmentTab } from '@/types';
import type { TransactionData } from '@/types/transactions';

export type ViewMode = 'dashboard' | 'members' | 'segments' | 'campaigns' | 'settings';

// Channel scope for the main dashboard — filters every widget at once.
export type DashboardChannel = ChannelName | 'all';

export interface AppState {
  data: MemberData | null;
  transactions: TransactionData | null;
  loading: boolean;
  selectedMember: Member | null;
  setSelectedMember: (m: Member | null) => void;
  // Lightweight, side-effect-free customer context for the chat (used by
  // pages like Customer 360 that aren't part of the dashboard's selected-row
  // flow and shouldn't trigger the right-panel-opening behavior of
  // setSelectedMember).
  chatContextMember: Member | null;
  setChatContextMember: (m: Member | null) => void;
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
  agentEnabled: boolean;
  refreshAgentConfig: () => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  dashboardChannel: DashboardChannel;
  setDashboardChannel: (c: DashboardChannel) => void;
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
  transactions: null,
  loading: true,
  selectedMember: null,
  setSelectedMember: () => {},
  chatContextMember: null,
  setChatContextMember: () => {},
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
  agentEnabled: true,
  refreshAgentConfig: () => {},
  view: 'dashboard',
  setView: () => {},
  dashboardChannel: 'all',
  setDashboardChannel: () => {},
  filters: defaultFilters,
  setFilters: () => {},
  scrollToTable: () => {},
  tableAnchorRef: null,
  persistStateForNavigation: () => {},
});

export function useApp() {
  return useContext(AppContext);
}
