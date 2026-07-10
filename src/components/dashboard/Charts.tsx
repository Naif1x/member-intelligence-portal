'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Title, DonutChart, BarChart, TabGroup, TabList, Tab } from '@tremor/react';
import { useApp, defaultFilters } from '@/lib/store';
import { computeSummary, SEGMENT_COLORS, SEGMENT_TREMOR_COLORS, SEGMENT_TAB_LABELS, type SegmentTab } from '@/types';
import { formatCurrency, getMemberName } from '@/lib/data';

const SEGMENT_TABS: SegmentTab[] = ['general', 'golf', 'retail', 'food'];

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
      <TabGroup index={tabIndex} onIndexChange={setTabIndex} className="mt-3">
        <TabList variant="solid">
          {SEGMENT_TABS.map((tab) => (
            <Tab key={tab}>{SEGMENT_TAB_LABELS[tab]}</Tab>
          ))}
        </TabList>
      </TabGroup>
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
        valueFormatter={(v) => formatCurrency(v)}
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
        valueFormatter={(v) => formatCurrency(v)}
        onValueChange={(v) => onBarClick(v as { name?: string })}
        showLegend={false}
      />
    </Card>
  );
}
