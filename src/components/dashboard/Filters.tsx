'use client';

import { useState } from 'react';
import { Chip, Input } from '@heroui/react';
import { useApp } from '@/lib/store';
import type { FilterState } from '@/lib/store';
import type { ChannelName } from '@/types';
import { SEGMENT_TAB_LABELS, CHANNEL_LABELS, type SegmentTab } from '@/types';

const SEGMENTS = [
  'Champion', 'Loyal', 'Almost Loyal', 'Occasional',
  'Big Spender at Risk', 'Almost Lost', 'Lost', 'No Data',
];

const SEGMENT_TABS: SegmentTab[] = ['general', 'golf', 'retail', 'food'];
const CHANNELS: ChannelName[] = ['golf', 'retail', 'food'];

const selectStyle = {
  border: '1px solid var(--sf-border)',
  fontSize: '0.8125rem',
  color: 'var(--sf-text)',
  background: 'white',
};

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Chip
      size="sm"
      onClick={onClick}
      className="cursor-pointer font-medium select-none"
      style={
        active
          ? { background: 'var(--sf-accent)', color: 'white', border: '1px solid var(--sf-accent)' }
          : { background: 'white', color: 'var(--sf-text-secondary)', border: '1px solid var(--sf-border)' }
      }
    >
      {children}
    </Chip>
  );
}

export default function Filters() {
  const { filters, setFilters } = useApp();
  const [expanded, setExpanded] = useState(false);

  function update(partial: Partial<FilterState>) {
    setFilters({ ...filters, ...partial });
  }

  function toggleSegment(seg: string) {
    const segments = filters.segments.includes(seg)
      ? filters.segments.filter((s) => s !== seg)
      : [...filters.segments, seg];
    update({ segments });
  }

  function toggleChannel(ch: ChannelName) {
    const channels = filters.channels.includes(ch)
      ? filters.channels.filter((c) => c !== ch)
      : [...filters.channels, ch];
    update({ channels });
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm mb-4" style={{ borderColor: 'var(--sf-border)' }}>
      <div className="flex items-center justify-between p-3 gap-3">
        <Input
          type="text"
          placeholder="Search by name, email, or ID..."
          aria-label="Search members"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="flex-1 min-w-[200px]"
        />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap flex-shrink-0"
          style={{ color: 'var(--sf-accent-dark)' }}
        >
          {expanded ? 'Hide Filters ▲' : 'More Filters ▼'}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-3 border-t pt-3" style={{ borderColor: 'var(--sf-border)' }}>
          {/* Segment filter */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Segment</span>
              <select
                value={filters.segmentTab}
                onChange={(e) => update({ segmentTab: e.target.value as SegmentTab, segments: [] })}
                className="px-2 py-1 rounded-md outline-none text-xs"
                style={selectStyle}
                aria-label="Segment field"
              >
                {SEGMENT_TABS.map((tab) => (
                  <option key={tab} value={tab}>{SEGMENT_TAB_LABELS[tab]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map((s) => (
                <ToggleChip key={s} active={filters.segments.includes(s)} onClick={() => toggleSegment(s)}>
                  {s}
                </ToggleChip>
              ))}
            </div>
          </div>

          {/* Channel filter */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Active In Channel</span>
              {filters.channels.length > 1 && (
                <div className="inline-flex rounded-md overflow-hidden border" style={{ borderColor: 'var(--sf-border)' }}>
                  {(['any', 'all'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => update({ channelMode: mode })}
                      className="px-2 py-0.5 text-[11px] font-medium"
                      style={
                        filters.channelMode === mode
                          ? { background: 'var(--sf-accent)', color: 'white' }
                          : { background: 'white', color: 'var(--sf-text-secondary)' }
                      }
                    >
                      {mode === 'any' ? 'Any' : 'All'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((ch) => (
                <ToggleChip key={ch} active={filters.channels.includes(ch)} onClick={() => toggleChannel(ch)}>
                  {CHANNEL_LABELS[ch]}
                </ToggleChip>
              ))}
            </div>
          </div>

          {/* Spend range, gender, flags */}
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>Spend Range (SAR)</div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={filters.spendMin ?? ''}
                  onChange={(e) => update({ spendMin: e.target.value === '' ? null : Number(e.target.value) })}
                  className="w-24 px-2 py-1.5 rounded-md outline-none text-sm"
                  style={selectStyle}
                  aria-label="Minimum spend"
                />
                <span style={{ color: 'var(--sf-text-secondary)' }}>–</span>
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={filters.spendMax ?? ''}
                  onChange={(e) => update({ spendMax: e.target.value === '' ? null : Number(e.target.value) })}
                  className="w-24 px-2 py-1.5 rounded-md outline-none text-sm"
                  style={selectStyle}
                  aria-label="Maximum spend"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>Gender</div>
              <select
                value={filters.gender}
                onChange={(e) => update({ gender: e.target.value })}
                className="px-3 py-1.5 rounded-md outline-none text-sm"
                style={selectStyle}
                aria-label="Filter by gender"
              >
                <option value="">Any</option>
                <option value="1">Male</option>
                <option value="0">Female</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-xs cursor-pointer pb-2" style={{ color: 'var(--sf-text-secondary)' }}>
              <input
                type="checkbox"
                checked={filters.riskOnly}
                onChange={(e) => update({ riskOnly: e.target.checked })}
                className="accent-orange-500"
              />
              At-Risk Only
            </label>

            <label className="flex items-center gap-1.5 text-xs cursor-pointer pb-2" style={{ color: 'var(--sf-text-secondary)' }}>
              <input
                type="checkbox"
                checked={filters.buyingOnly}
                onChange={(e) => update({ buyingOnly: e.target.checked })}
                className="accent-cyan-500"
              />
              Buying Members Only
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
