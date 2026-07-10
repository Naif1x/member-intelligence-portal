'use client';

import { useApp, type ViewMode } from '@/lib/store';
import { defaultFilters } from '@/lib/store';

const NAV_ITEMS: { label: string; icon: string; view: ViewMode; openFilters?: boolean }[] = [
  { label: 'Main Dashboard', icon: '📊', view: 'dashboard' },
  { label: 'All Dashboards', icon: '🗂️', view: 'dashboard' },
  { label: 'Members', icon: '👥', view: 'members' },
  { label: 'Segments', icon: '🎯', view: 'segments' },
  { label: 'Campaign Analysis', icon: '📣', view: 'campaigns' },
  { label: 'Filter Members', icon: '🔍', view: 'members', openFilters: true },
];

function SidebarContent() {
  const { sidebarCollapsed, setSidebarCollapsed, data, view, setView, setFiltersOpen, setFilters } = useApp();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--sf-border)' }}>
        {!sidebarCollapsed && (
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>
            Navigation
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex w-7 h-7 rounded items-center justify-center hover:bg-black/5 transition-colors"
          style={{ color: 'var(--sf-text-secondary)' }}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const active = view === item.view && !item.openFilters;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.openFilters) {
                  setFilters(defaultFilters);
                  setView(item.view);
                  setFiltersOpen(true);
                } else {
                  setView(item.view);
                }
              }}
              className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active ? 'nav-item-active font-semibold' : 'hover:bg-black/5'
              }`}
              style={{ color: active ? 'var(--sf-accent-dark)' : 'var(--sf-text)' }}
            >
              <span className="text-base">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--sf-border)' }}>
          <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--sf-success)' }}>
            <span>✓</span> Connected to D360
          </div>
          <div className="flex items-center gap-2 py-1 text-xs" style={{ color: 'var(--sf-success)' }}>
            <span>✓</span> Agentforce Active
          </div>
          {data && (
            <div className="mt-3 pt-3 border-t text-[10px]" style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text-secondary)' }}>
              {data.metadata.total_unified_profiles} unified profiles
              <br />
              from {data.metadata.total_source_records} source records
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useApp();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex h-full flex-col transition-all duration-300 ease-in-out flex-shrink-0 border-r"
        style={{
          width: sidebarCollapsed ? 60 : 240,
          background: 'var(--sf-sidebar-bg)',
          borderColor: 'var(--sf-border)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <aside
            className="relative h-full flex flex-col w-64 border-r"
            style={{ background: 'var(--sf-sidebar-bg)', borderColor: 'var(--sf-border)' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
