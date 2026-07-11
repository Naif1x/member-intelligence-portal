'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { AppContext, defaultFilters, type FilterState, type ViewMode } from '@/lib/store';
import type { MemberData, Member } from '@/types';
import type { TransactionData } from '@/types/transactions';
import { loadDashboardState, saveDashboardState } from '@/lib/uiState';

export default function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MemberData | null>(null);
  const [transactions, setTransactions] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [chatContextMember, setChatContextMember] = useState<Member | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [businessInsightsOpen, setBusinessInsightsOpenState] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeedPrompt, setChatSeedPrompt] = useState<string | null>(null);
  const [agentEnabled, setAgentEnabled] = useState(true);
  const restored = loadDashboardState();
  const [view, setViewState] = useState<ViewMode>(restored?.view || 'dashboard');
  const [filters, setFilters] = useState<FilterState>(restored?.filters || defaultFilters);
  const tableAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/data/d360_datagraph_export.json')
      .then(r => r.json())
      .then((d: MemberData) => {
        setData(d);
        setLoading(false);
      });
    fetch('/data/transactions.json')
      .then((r) => r.json())
      .then((t: TransactionData) => setTransactions(t))
      .catch(() => {});
  }, []);

  function refreshAgentConfig() {
    fetch('/api/agent/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        // "Active" means the toggle is on AND the integration is actually
        // usable (secrets + Agent ID + My Domain present) — not just the
        // toggle state, so the FAB and sidebar chip don't lie about a
        // half-configured integration.
        if (cfg) setAgentEnabled(Boolean(cfg.enabled && cfg.hasSecrets && cfg.agentId && cfg.myDomain));
      })
      .catch(() => {});
  }

  useEffect(() => {
    refreshAgentConfig();
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

  // The member-insights panel and the portfolio-wide insights panel share
  // the same dock, so opening one closes the other.
  function setBusinessInsightsOpen(v: boolean) {
    setBusinessInsightsOpenState(v);
    if (v) setRightPanelOpen(false);
  }

  function persistStateForNavigation() {
    saveDashboardState(filters, view);
  }

  return (
    <AppContext.Provider
      value={{
        data,
        transactions,
        loading,
        selectedMember,
        setSelectedMember: (m) => {
          setSelectedMember(m);
          if (m) {
            setRightPanelOpen(true);
            setBusinessInsightsOpenState(false);
          }
        },
        chatContextMember,
        setChatContextMember,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        rightPanelOpen,
        setRightPanelOpen,
        businessInsightsOpen,
        setBusinessInsightsOpen,
        chatOpen,
        setChatOpen,
        chatSeedPrompt,
        openChatWithContext,
        agentEnabled,
        refreshAgentConfig,
        view,
        setView,
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
