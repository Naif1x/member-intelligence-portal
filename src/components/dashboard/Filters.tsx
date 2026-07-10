'use client';

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

  const inputStyle = {
    border: '1px solid var(--sf-border)',
    fontSize: '0.8125rem',
    color: 'var(--sf-text)',
    background: 'white',
  };

  return (
    <div className="slds-card p-3 mb-4 flex items-center gap-3 flex-wrap">
      <input
        type="text"
        placeholder="Search by name, email, or ID..."
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="px-3 py-1.5 rounded-md flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-cyan-400"
        style={inputStyle}
      />

      <select
        value={filters.segment}
        onChange={(e) => update({ segment: e.target.value })}
        className="px-3 py-1.5 rounded-md outline-none"
        style={inputStyle}
      >
        <option value="">All Segments</option>
        {SEGMENTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.channel}
        onChange={(e) => update({ channel: e.target.value as ChannelName | '' })}
        className="px-3 py-1.5 rounded-md outline-none"
        style={inputStyle}
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

      <button
        onClick={() => setFiltersOpen(false)}
        className="text-xs px-2 py-1 rounded hover:bg-gray-100 ml-auto"
        style={{ color: 'var(--sf-accent-dark)' }}
      >
        Hide Filters
      </button>
    </div>
  );
}
