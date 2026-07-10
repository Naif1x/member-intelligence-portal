'use client';

import { useApp } from '@/lib/store';
import type { FilterState } from '@/lib/store';

const SEGMENTS = [
  'Champions', 'Loyal', 'Almost Loyal', 'Occasional',
  'Big Spenders', 'Big Spenders at Risk', 'Almost Lost', 'Lost',
];

export default function Filters() {
  const { filters, setFilters } = useApp();

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
        className="px-3 py-1.5 rounded-md flex-1 min-w-[200px] outline-none focus:ring-2 focus:ring-blue-400"
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
        onChange={(e) => update({ channel: e.target.value })}
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
          className="accent-red-600"
        />
        At-Risk Only
      </label>

      {(filters.search || filters.segment || filters.channel || filters.riskOnly) && (
        <button
          onClick={() => setFilters({ ...filters, search: '', segment: '', channel: '', riskOnly: false })}
          className="text-xs px-2 py-1 rounded hover:bg-gray-100"
          style={{ color: 'var(--sf-secondary)' }}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
