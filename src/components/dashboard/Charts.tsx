'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Title, DonutChart, BarChart } from '@tremor/react';
import { useApp, defaultFilters } from '@/lib/store';
import { computeSummary, SEGMENT_COLORS, SEGMENT_TREMOR_COLORS, SEGMENT_TAB_LABELS, type SegmentTab } from '@/types';
import { getMemberName } from '@/lib/data';

const SEGMENT_TABS: SegmentTab[] = ['general', 'golf', 'retail', 'food'];

// Compact axis/tooltip formatter — "SAR 1,200,000" overflows Tremor's default
// yAxisWidth and gets clipped, so keep it short (SAR 1.2M / SAR 300K).
function formatCompactCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `SAR ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `SAR ${Math.round(v / 1000)}K`;
  return `SAR ${v}`;
}

// Tremor's Legend truncates long labels ("Big Spe..."); this one wraps instead.
function WrappingLegend({ items }: { items: { name: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((d) => (
        <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: SEGMENT_COLORS[d.name] || '#D1D5DB' }}
          />
          <span>{d.name}</span>
        </div>
      ))}
    </div>
  );
}

// Plain button tab bar — Tremor's TabGroup/TabList/Tab rely on Tailwind
// utility classes that Tailwind v4's default scanner doesn't pick up from
// node_modules, so they render unstyled. This avoids that dependency.
function SegmentTabBar({ activeIndex, onChange }: { activeIndex: number; onChange: (i: number) => void }) {
  return (
    <div className="mt-3 inline-flex rounded-lg p-1 gap-1" style={{ background: 'var(--sf-surface)' }}>
      {SEGMENT_TABS.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(i)}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
          style={
            i === activeIndex
              ? { background: 'var(--sf-accent)', color: 'white' }
              : { color: 'var(--sf-text-secondary)' }
          }
        >
          {SEGMENT_TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}

export function SegmentDonut() {
  const { data, setFilters, setView, scrollToTable } = useApp();
  const [tabIndex, setTabIndex] = useState(0);
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const segmentTab = SEGMENT_TABS[tabIndex];
  const chartData = Object.entries(summary.segmentDistributionByTab[segmentTab]).map(([name, value]) => ({ name, value }));
  const colors = chartData.map((d) => SEGMENT_TREMOR_COLORS[d.name] || 'slate');

  function onSliceClick(v: { name?: string } | undefined) {
    if (!v?.name) return;
    setFilters({ ...defaultFilters, segment: v.name, segmentTab });
    setView('members');
    scrollToTable();
  }

  return (
    <Card>
      <Title>Segment Distribution</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Click a segment to filter members</p>
      <SegmentTabBar activeIndex={tabIndex} onChange={setTabIndex} />
      <DonutChart
        className="mt-4 h-56 cursor-pointer"
        data={chartData}
        category="value"
        index="name"
        colors={colors}
        onValueChange={(v) => onSliceClick(v as { name?: string })}
        valueFormatter={(v) => `${v} members`}
      />
      <WrappingLegend items={chartData} />
    </Card>
  );
}

export function ChannelBar() {
  const { data, setFilters, setView, scrollToTable } = useApp();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const chartData = [
    { name: 'Golf', Revenue: Math.round(summary.channelSpend.golf) },
    { name: 'Retail', Revenue: Math.round(summary.channelSpend.retail) },
    { name: 'F&B', Revenue: Math.round(summary.channelSpend.food) },
  ];

  function onBarClick(v: { name?: string } | undefined) {
    if (!v?.name) return;
    const map: Record<string, 'golf' | 'retail' | 'food'> = { Golf: 'golf', Retail: 'retail', 'F&B': 'food' };
    const channel = map[v.name];
    if (!channel) return;
    setFilters({ ...defaultFilters, channel });
    setView('members');
    scrollToTable();
  }

  return (
    <Card>
      <Title>Revenue by Channel</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Click a bar to filter by channel</p>
      <BarChart
        className="mt-4 h-56 cursor-pointer"
        data={chartData}
        index="name"
        categories={['Revenue']}
        colors={['cyan']}
        valueFormatter={formatCompactCurrency}
        yAxisWidth={85}
        onValueChange={(v) => onBarClick(v as { name?: string })}
        showLegend={false}
      />
    </Card>
  );
}

export function TopMembersBySpend() {
  const { data, persistStateForNavigation } = useApp();
  const router = useRouter();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const chartData = summary.topMembersBySpend.map((m) => ({
    name: getMemberName(m).length > 18 ? getMemberName(m).slice(0, 18) + '…' : getMemberName(m),
    Spend: Math.round(m.total_spend),
    id: m.id,
  }));

  function onBarClick(v: { name?: string } | undefined) {
    if (!v?.name) return;
    const match = chartData.find((d) => d.name === v.name);
    if (match) {
      persistStateForNavigation();
      router.push(`/member/${match.id}`);
    }
  }

  return (
    <Card>
      <Title>Top Members by Spend</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Click a member to open their 360 profile</p>
      <BarChart
        className="mt-4 h-64 cursor-pointer"
        data={chartData}
        index="name"
        categories={['Spend']}
        colors={['cyan']}
        layout="vertical"
        valueFormatter={formatCompactCurrency}
        yAxisWidth={140}
        onValueChange={(v) => onBarClick(v as { name?: string })}
        showLegend={false}
      />
    </Card>
  );
}
