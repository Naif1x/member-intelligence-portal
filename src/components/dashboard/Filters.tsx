'use client';

import { Button, Input } from '@heroui/react';
import { useApp } from '@/lib/store';
import type { FilterState } from '@/lib/store';
import type { ChannelName } from '@/types';

const SEGMENTS = [
  'Champion', 'Loyal', 'Almost Loyal', 'Occasional',
  'Big Spender at Risk', 'Almost Lost', 'Lost', 'No Data',
];

export default function Filters() {
  const { filters, setFilters, filtersOpen, setFiltersOpen } = useApp();

  if (!filtersOpen) return null;

  function update(partial: Partial<FilterState>) {
    setFilters({ ...filters, ...partial });
  }

  const selectStyle = {
    border: '1px solid var(--sf-border)',
    fontSize: '0.8125rem',
    color: 'var(--sf-text)',
    background: 'white',
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--sf-border)' }}>
      <Input
        type="text"
        placeholder="Search by name, email, or ID..."
        aria-label="Search members"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="flex-1 min-w-[200px]"
      />

      <select
        value={filters.segmentTab === 'general' ? filters.segment : ''}
        onChange={(e) => update({ segment: e.target.value, segmentTab: 'general' })}
        className="px-3 py-2 rounded-lg outline-none"
        style={selectStyle}
        aria-label="Filter by segment"
      >
        <option value="">All Segments</option>
        {SEGMENTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.channel}
        onChange={(e) => update({ channel: e.target.value as ChannelName | '' })}
        className="px-3 py-2 rounded-lg outline-none"
        style={selectStyle}
        aria-label="Filter by channel"
      >
        <option value="">All Channels</option>
        <option value="golf">Golf</option>
        <option value="retail">Retail</option>
        <option value="food">F&B</option>
      </select>

      <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--sf-text-secondary)' }}>
        <input
          type="checkbox"
          checked={filters.riskOnly}
          onChange={(e) => update({ riskOnly: e.target.checked })}
          className="accent-orange-500"
        />
        At-Risk Only
      </label>

      <Button
        size="sm"
        variant="ghost"
        onPress={() => setFiltersOpen(false)}
        className="ml-auto"
        style={{ color: 'var(--sf-accent-dark)' }}
      >
        Hide Filters
      </Button>
    </div>
  );
}
