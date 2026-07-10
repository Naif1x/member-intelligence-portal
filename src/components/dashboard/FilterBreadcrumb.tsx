'use client';

import { useApp, defaultFilters } from '@/lib/store';
import { CHANNEL_LABELS } from '@/types';

export default function FilterBreadcrumb() {
  const { filters, setFilters } = useApp();

  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.segment) {
    chips.push({ key: 'segment', label: `${filters.segment} segment`, clear: () => setFilters({ ...filters, segment: '' }) });
  }
  if (filters.channel) {
    chips.push({ key: 'channel', label: `${CHANNEL_LABELS[filters.channel]} channel`, clear: () => setFilters({ ...filters, channel: '' }) });
  }
  if (filters.riskOnly) {
    chips.push({ key: 'risk', label: 'At-risk only', clear: () => setFilters({ ...filters, riskOnly: false }) });
  }
  if (filters.buyingOnly) {
    chips.push({ key: 'buying', label: 'Buying members only', clear: () => setFilters({ ...filters, buyingOnly: false }) });
  }
  if (filters.recencyScore !== null) {
    chips.push({ key: 'recency', label: `Recency R${filters.recencyScore}`, clear: () => setFilters({ ...filters, recencyScore: null }) });
  }
  if (filters.search) {
    chips.push({ key: 'search', label: `"${filters.search}"`, clear: () => setFilters({ ...filters, search: '' }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
      <span className="text-xs font-medium" style={{ color: 'var(--sf-text-secondary)' }}>Filtered by:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--sf-hover)', color: 'var(--sf-accent-dark)', border: '1px solid var(--sf-accent)' }}
        >
          {chip.label}
          <button onClick={chip.clear} className="hover:opacity-70 font-bold leading-none">×</button>
        </span>
      ))}
      <button
        onClick={() => setFilters(defaultFilters)}
        className="text-xs font-medium underline"
        style={{ color: 'var(--sf-text-secondary)' }}
      >
        Clear all
      </button>
    </div>
  );
}
