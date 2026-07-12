'use client';

import { Button } from '@heroui/react';
import { LayoutDashboard, Users, Target, Megaphone, Settings, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useApp, type ViewMode } from '@/lib/store';

const NAV_ITEMS: { label: string; icon: LucideIcon; view: ViewMode }[] = [
  { label: 'Main Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Members', icon: Users, view: 'members' },
  { label: 'Segments', icon: Target, view: 'segments' },
  { label: 'Action Center', icon: Megaphone, view: 'campaigns' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

function SidebarContent() {
  const { sidebarCollapsed, setSidebarCollapsed, view, setView } = useApp();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--sf-border)' }}>
        {!sidebarCollapsed && (
          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>
            Navigation
          </div>
        )}
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex"
          style={{ color: 'var(--sf-text-secondary)' }}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 flex flex-col">
        {NAV_ITEMS.map((item) => {
          const active = view === item.view;
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant="ghost"
              fullWidth
              onPress={() => setView(item.view)}
              className={`nav-item justify-start gap-3 px-4 py-2.5 h-auto rounded-none text-sm font-normal ${
                active ? 'nav-item-active font-semibold' : 'hover:bg-black/5'
              }`}
              style={{ color: active ? 'var(--sf-accent-dark)' : 'var(--sf-text)' }}
            >
              <Icon size={18} strokeWidth={2} className="flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>
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
