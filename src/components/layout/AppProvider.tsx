'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { AppContext, defaultFilters, type FilterState, type ViewMode } from '@/lib/store';
import type { MemberData, Member } from '@/types';
import { loadDashboardState, saveDashboardState } from '@/lib/uiState';

export default function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeedPrompt, setChatSeedPrompt] = useState<string | null>(null);
  const restored = loadDashboardState();
  const [view, setViewState] = useState<ViewMode>(restored?.view || 'dashboard');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(restored?.filters || defaultFilters);
  const tableAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/data/d360_datagraph_export.json')
      .then(r => r.json())
      .then((d: MemberData) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  function scrollToTable() {
    setTimeout(() => {
      tableAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function setView(v: ViewMode) {
    setViewState(v);
    setMobileSidebarOpen(false);
  }

  function openChatWithContext(prompt: string) {
    setChatSeedPrompt(prompt);
    setChatOpen(true);
  }

  function persistStateForNavigation() {
    saveDashboardState(filters, view);
  }

  return (
    <AppContext.Provider
      value={{
        data,
        loading,
        selectedMember,
        setSelectedMember: (m) => {
          setSelectedMember(m);
          if (m) setRightPanelOpen(true);
        },
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        rightPanelOpen,
        setRightPanelOpen,
        chatOpen,
        setChatOpen,
        chatSeedPrompt,
        openChatWithContext,
        view,
        setView,
        filtersOpen,
        setFiltersOpen,
        filters,
        setFilters,
        scrollToTable,
        tableAnchorRef,
        persistStateForNavigation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
