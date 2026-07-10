'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { AppContext, defaultFilters, type FilterState } from '@/lib/store';
import type { MemberData, Member } from '@/types';

export default function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  useEffect(() => {
    fetch('/data/d360_datagraph_export.json')
      .then(r => r.json())
      .then((d: MemberData) => {
        setData(d);
        setLoading(false);
      });
  }, []);

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
        rightPanelOpen,
        setRightPanelOpen,
        chatOpen,
        setChatOpen,
        filters,
        setFilters,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
