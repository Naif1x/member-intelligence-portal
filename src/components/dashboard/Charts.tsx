'use client';

import { useMemo, useState } from 'react';
import { Card, Title, DonutChart, BarChart, LineChart, type CustomTooltipProps } from '@tremor/react';
import { useApp } from '@/lib/store';
import { computeSummary, SEGMENT_COLORS, SEGMENT_TREMOR_COLORS, SEGMENT_TAB_LABELS, CHANNEL_COLORS, CHANNEL_TREMOR_COLORS, CHANNEL_LABELS, type SegmentTab, type ChannelName } from '@/types';
import { getMemberName, formatCompactCurrency } from '@/lib/data';
import { computeCrossChannelValue, getTopItemsByRevenue, computeMonthlySpendTrend } from '@/lib/transactions';

const SEGMENT_TABS: SegmentTab[] = ['general', 'golf', 'retail', 'food'];

// Tremor's default chart tooltip relies on Tailwind utility classes that
// Tailwind v4's scanner doesn't pick up from node_modules, so it renders
// unstyled and overlapping (same root cause as the tab bar). This is a
// self-contained replacement styled with the app's own tokens.
function makeChartTooltip(valueFormatter: (v: number) => string, showLabel = true) {
  return function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    // Pie/donut payloads repeat the slice name as both label and entry name —
    // skip the redundant header line in that case.
    const showHeader = showLabel && label && !(payload.length === 1 && payload[0].name === label);
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{ background: 'white', border: '1px solid var(--sf-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      >
        {showHeader && (
          <div className="font-semibold mb-1 whitespace-nowrap" style={{ color: 'var(--sf-primary)' }}>
            {label}
          </div>
        )}
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {p.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />}
            <span style={{ color: 'var(--sf-text-secondary)' }}>{p.name}:</span>
            <span className="font-semibold" style={{ color: 'var(--sf-text)' }}>{valueFormatter(Number(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };
}

const CurrencyTooltip = makeChartTooltip(formatCompactCurrency);
const MembersTooltip = makeChartTooltip((v) => `${v} members`);

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

// Charts are display-only — hover for detail via tooltip, no click-to-filter
// or click-to-navigate. Segmenting/filtering happens on the Members page.
export function SegmentDonut() {
  const { data } = useApp();
  const [tabIndex, setTabIndex] = useState(0);
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const segmentTab = SEGMENT_TABS[tabIndex];
  const chartData = Object.entries(summary.segmentDistributionByTab[segmentTab]).map(([name, value]) => ({ name, value }));
  const colors = chartData.map((d) => SEGMENT_TREMOR_COLORS[d.name] || 'slate');

  return (
    <Card>
      <Title>Segment Distribution</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Hover a segment for details</p>
      <SegmentTabBar activeIndex={tabIndex} onChange={setTabIndex} />
      <DonutChart
        className="mt-4 h-56"
        data={chartData}
        category="value"
        index="name"
        colors={colors}
        valueFormatter={(v) => `${v} members`}
        customTooltip={MembersTooltip}
      />
      <WrappingLegend items={chartData} />
    </Card>
  );
}

const CHANNEL_ORDER: ChannelName[] = ['golf', 'retail', 'food'];

export function RevenueDonut() {
  const { data } = useApp();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const total = summary.channelSpend.golf + summary.channelSpend.retail + summary.channelSpend.food;
  const chartData = CHANNEL_ORDER.map((ch) => ({ name: CHANNEL_LABELS[ch], value: Math.round(summary.channelSpend[ch]) }));
  const colors = CHANNEL_ORDER.map((ch) => CHANNEL_TREMOR_COLORS[ch]);

  return (
    <Card>
      <Title>Revenue by Channel</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Hover a segment for details</p>
      <DonutChart
        className="mt-4 h-56"
        data={chartData}
        category="value"
        index="name"
        colors={colors}
        valueFormatter={formatCompactCurrency}
        customTooltip={CurrencyTooltip}
      />
      <div className="mt-3 flex flex-col gap-1.5">
        {CHANNEL_ORDER.map((ch) => {
          const pct = total > 0 ? Math.round((summary.channelSpend[ch] / total) * 100) : 0;
          return (
            <div key={ch} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5" style={{ color: 'var(--sf-text-secondary)' }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHANNEL_COLORS[ch] }} />
                {CHANNEL_LABELS[ch]}
              </span>
              <span className="font-medium" style={{ color: 'var(--sf-text)' }}>
                {formatCompactCurrency(summary.channelSpend[ch])} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CrossChannelValueChart() {
  const { data } = useApp();
  const buckets = useMemo(() => (data ? computeCrossChannelValue(data.members) : null), [data]);
  if (!data || !buckets) return null;

  const chartData = [
    { name: '1 Channel', Members: buckets[1].count },
    { name: '2 Channels', Members: buckets[2].count },
    { name: '3 Channels', Members: buckets[3].count },
  ];
  const multiplier = buckets[1].avgSpend > 0 ? buckets[3].avgSpend / buckets[1].avgSpend : 0;

  return (
    <Card>
      <Title>Cross-Channel Member Value</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Members active in 1, 2, or 3 channels</p>

      <div className="mt-3 mb-4 p-3 rounded-lg text-sm leading-relaxed" style={{ background: 'var(--sf-hover)', color: 'var(--sf-text)' }}>
        Tri-channel members average{' '}
        <strong style={{ color: 'var(--sf-accent-dark)' }}>{formatCompactCurrency(buckets[3].avgSpend)}</strong> in spend —{' '}
        <strong style={{ color: 'var(--sf-accent-dark)' }}>{multiplier.toFixed(1)}×</strong> single-channel members
        ({formatCompactCurrency(buckets[1].avgSpend)}, {buckets[1].count} members).
      </div>

      <BarChart
        className="h-48"
        data={chartData}
        index="name"
        categories={['Members']}
        colors={['cyan']}
        showLegend={false}
        customTooltip={MembersTooltip}
      />
    </Card>
  );
}

export function TopItemsChart() {
  const { transactions } = useApp();
  const topItems = useMemo(() => (transactions ? getTopItemsByRevenue(transactions.items, 10) : []), [transactions]);
  if (!transactions) return null;

  const chartData = topItems.map((i) => ({ name: truncateName(i.name, 30), Revenue: i.revenue }));

  return (
    <Card>
      <Title>Top Items by Revenue</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Across Golf, Retail, and F&B — hover a bar for details</p>
      <BarChart
        className="mt-4 h-[380px] top-items-chart"
        data={chartData}
        index="name"
        categories={['Revenue']}
        colors={['cyan']}
        layout="vertical"
        valueFormatter={formatCompactCurrency}
        yAxisWidth={195}
        showLegend={false}
        customTooltip={CurrencyTooltip}
      />
    </Card>
  );
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function SpendTrendChart() {
  const { transactions } = useApp();
  const monthly = useMemo(() => (transactions ? computeMonthlySpendTrend(transactions.headers) : []), [transactions]);
  if (!transactions) return null;

  const chartData = monthly.map((m) => ({
    month: formatMonthLabel(m.month),
    Golf: m.golf,
    Retail: m.retail,
    'F&B': m.food,
  }));

  return (
    <Card>
      <Title>Spend Trend</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Monthly, by channel</p>
      <LineChart
        className="mt-4 h-64"
        data={chartData}
        index="month"
        categories={['Golf', 'Retail', 'F&B']}
        colors={['green', 'blue', 'amber']}
        valueFormatter={formatCompactCurrency}
        customTooltip={CurrencyTooltip}
      />
    </Card>
  );
}

// Truncates on a word boundary instead of mid-word, and only when the name
// actually overflows the axis label column — most member names (~20 chars)
// fit as-is.
function truncateName(name: string, max = 22): string {
  if (name.length <= max) return name;
  const clipped = name.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > max * 0.4 ? clipped.slice(0, lastSpace) : clipped;
  return `${base}…`;
}

export function TopMembersBySpend() {
  const { data } = useApp();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  const chartData = summary.topMembersBySpend.map((m) => ({
    name: truncateName(getMemberName(m)),
    Spend: Math.round(m.total_spend),
    id: m.id,
  }));

  return (
    <Card>
      <Title>Top Members by Spend</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Hover a bar for details</p>
      <BarChart
        className="mt-4 h-[420px] top-members-chart"
        data={chartData}
        index="name"
        categories={['Spend']}
        colors={['cyan']}
        layout="vertical"
        valueFormatter={formatCompactCurrency}
        yAxisWidth={155}
        showLegend={false}
        customTooltip={CurrencyTooltip}
      />
    </Card>
  );
}
