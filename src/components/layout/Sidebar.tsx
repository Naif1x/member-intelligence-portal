'use client';

import { useApp } from '@/lib/store';
import { usePathname, useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', path: '/' },
  { label: 'Members', icon: '👥', path: '/#members' },
  { label: 'Segments', icon: '🎯', path: '/#segments' },
  { label: 'Channels', icon: '📡', path: '/#channels' },
];

const SYSTEM_STATUS = [
  { name: 'LSGolf', status: 'connected' as const },
  { name: 'LSRetail', status: 'connected' as const },
  { name: 'Infrasys F&B', status: 'connected' as const },
  { name: 'Jigsaw App', status: 'connected' as const },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, data } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside
      className="h-full flex flex-col transition-all duration-300 ease-in-out flex-shrink-0"
      style={{
        width: sidebarCollapsed ? 60 : 260,
        background: 'var(--sf-sidebar-bg)',
        color: 'var(--sf-sidebar-text)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
              D
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Member D360</div>
              <div className="text-[10px] text-white/60">Intelligence Platform</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-white/70"
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path || (item.path === '/' && pathname === '/');
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-white/15 text-white border-l-3 border-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white border-l-3 border-transparent'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
            Connected Systems
          </div>
          {SYSTEM_STATUS.map((sys) => (
            <div key={sys.name} className="flex items-center gap-2 py-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/60">{sys.name}</span>
            </div>
          ))}
          {data && (
            <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-white/40">
              {data.summary.totalMembers} members resolved
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
