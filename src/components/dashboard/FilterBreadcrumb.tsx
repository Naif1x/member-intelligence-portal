'use client';

import { Button, Chip } from '@heroui/react';
import { useApp, defaultFilters } from '@/lib/store';
import { CHANNEL_LABELS, SEGMENT_TAB_LABELS } from '@/types';

export default function FilterBreadcrumb() {
  const { filters, setFilters } = useApp();

  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.segment) {
    const tabLabel = filters.segmentTab !== 'general' ? ` (${SEGMENT_TAB_LABELS[filters.segmentTab]})` : '';
    chips.push({
      key: 'segment',
      label: `${filters.segment} segment${tabLabel}`,
      clear: () => setFilters({ ...filters, segment: '', segmentTab: 'general' }),
    });
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
  if (filters.search) {
    chips.push({ key: 'search', label: `"${filters.search}"`, clear: () => setFilters({ ...filters, search: '' }) });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
      <span className="text-xs font-medium" style={{ color: 'var(--sf-text-secondary)' }}>Filtered by:</span>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          size="sm"
          className="gap-1.5 font-medium"
          style={{ background: 'var(--sf-hover)', color: 'var(--sf-accent-dark)', border: '1px solid var(--sf-accent)' }}
        >
          {chip.label}
          <button onClick={chip.clear} aria-label={`Remove ${chip.label} filter`} className="hover:opacity-70 font-bold leading-none ml-1">×</button>
        </Chip>
      ))}
      <Button
        size="sm"
        variant="ghost"
        onPress={() => setFilters(defaultFilters)}
        className="underline h-auto min-h-0 py-0.5"
        style={{ color: 'var(--sf-text-secondary)' }}
      >
        Clear all
      </Button>
    </div>
  );
}
