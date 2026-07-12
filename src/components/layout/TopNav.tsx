'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Input } from '@heroui/react';
import { Flag, Menu, Search, Bell } from 'lucide-react';
import { useApp } from '@/lib/store';
import { getMemberName } from '@/lib/data';
import SegmentChip from '@/components/ui/SegmentChip';

export default function TopNav() {
  const { data, mobileSidebarOpen, setMobileSidebarOpen, persistStateForNavigation } = useApp();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!data || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return data.members
      .filter((m) => getMemberName(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [data, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header
      className="h-14 flex-shrink-0 flex items-center gap-3 px-4 z-30"
      style={{ background: 'var(--sf-primary)' }}
    >
      <Button
        isIconOnly
        variant="ghost"
        size="sm"
        aria-label="Toggle navigation menu"
        onPress={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="md:hidden text-white/80 hover:text-white flex-shrink-0"
      >
        <Menu size={20} strokeWidth={2} />
      </Button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ background: 'var(--sf-accent)' }}
        >
          <Flag size={18} strokeWidth={2.25} />
        </div>
        <span className="hidden sm:block text-white text-sm font-bold whitespace-nowrap">
          Luxury Golf
        </span>
      </div>

      {/* Search */}
      <div ref={containerRef} className="relative flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Find Member..."
            aria-label="Find member"
            fullWidth
            className="pl-9 bg-white/95 focus:bg-white"
          />
        </div>

        {open && query.trim().length >= 2 && (
          <Card className="absolute top-full mt-1 left-0 right-0 overflow-hidden max-h-80 overflow-y-auto z-40 p-0">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: 'var(--sf-text-secondary)' }}>No members found</div>
            ) : (
              results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    persistStateForNavigation();
                    router.push(`/member/${m.id}`);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--sf-primary)' }}>{getMemberName(m)}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--sf-text-secondary)' }}>{m.email}</div>
                  </div>
                  <SegmentChip segment={m.general_segment} className="flex-shrink-0" />
                </button>
              ))
            )}
          </Card>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <Button
          isIconOnly
          variant="ghost"
          size="sm"
          aria-label="Notifications"
          className="relative text-white/80 hover:text-white"
        >
          <Bell size={18} strokeWidth={2} />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--sf-warning)' }} />
        </Button>
        <Avatar size="sm" className="cursor-pointer text-white text-xs font-bold" style={{ background: 'var(--sf-accent)' }}>
          <Avatar.Fallback className="bg-transparent text-white">NA</Avatar.Fallback>
        </Avatar>
      </div>
    </header>
  );
}
