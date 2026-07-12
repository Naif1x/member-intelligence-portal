'use client';

import { useMemo, useState } from 'react';
import { Card, Title, DonutChart, BarChart, LineChart, ScatterChart, type CustomTooltipProps } from '@tremor/react';
import { Users, CalendarCheck } from 'lucide-react';
import { useApp, type DashboardChannel } from '@/lib/store';
import {
  computeSummary, SEGMENT_COLORS, SEGMENT_TREMOR_COLORS, SEGMENT_TAB_LABELS,
  CHANNEL_LABELS, type SegmentTab, type ChannelName,
} from '@/types';
import { getMemberName, formatCompactCurrency, formatCurrency } from '@/lib/data';
import {
  computeCrossChannelValueScoped, computeSegmentRevenue, computeRfmScatter,
  computeCrossShop, getTopItemsByRevenue, computeMonthlySpendTrend,
  scopeItems, scopeHeaders, memberSpendFor, memberActiveIn,
} from '@/lib/transactions';
import SegmentChip from '@/components/ui/SegmentChip';

const SEGMENT_TABS: SegmentTab[] = ['general', 'golf', 'retail', 'food'];

// Fixed ordering so scatter/legend colors stay stable regardless of data order.
const SEGMENT_ORDER = ['Champion', 'Loyal', 'Almost Loyal', 'Occasional', 'Big Spender at Risk', 'Almost Lost', 'Lost'];

// Tremor's default chart tooltip relies on Tailwind utility classes that
// Tailwind v4's scanner doesn't pick up from node_modules, so it renders
// unstyled and overlapping (same root cause as the tab bar). This is a
// self-contained replacement styled with the app's own tokens.
function makeChartTooltip(valueFormatter: (v: number) => string, showLabel = true) {
  return function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
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

// ---- Global dashboard channel filter -------------------------------------

const FILTER_OPTIONS: { value: DashboardChannel; label: string }[] = [
  { value: 'all', label: 'All Channels' },
  { value: 'golf', label: 'Golf' },
  { value: 'retail', label: 'Retail' },
  { value: 'food', label: 'F&B' },
];

export function DashboardChannelFilter() {
  const { dashboardChannel, setDashboardChannel } = useApp();
  return (
    <div className="inline-flex rounded-lg p-1 gap-1 mb-4" style={{ background: 'white', border: '1px solid var(--sf-border)' }}>
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setDashboardChannel(opt.value)}
          className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          style={
            dashboardChannel === opt.value
              ? { background: 'var(--sf-primary)', color: 'white' }
              : { color: 'var(--sf-text-secondary)' }
          }
        >
          {opt.label}
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
  const chartData = Object.entries(summary.segmentDistributionByTab[segmentTab])
    .filter(([name]) => name !== 'No Data')
    .map(([name, value]) => ({ name, value }));
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

// ---- Cross-channel member value ------------------------------------------

export function CrossChannelValueChart() {
  const { data, dashboardChannel } = useApp();
  const buckets = useMemo(
    () => (data ? computeCrossChannelValueScoped(data.members, dashboardChannel) : null),
    [data, dashboardChannel]
  );
  if (!data || !buckets) return null;

  const chartData = buckets.map((b) => ({ name: b.label, Members: b.count }));
  const single = buckets[0];
  const tri = buckets[2];
  const multiplier = single.avgSpend > 0 ? tri.avgSpend / single.avgSpend : 0;

  return (
    <Card>
      <Title>Cross-Channel Member Value</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        {dashboardChannel === 'all' ? 'Members active in 1, 2, or 3 channels' : `${CHANNEL_LABELS[dashboardChannel]} members, by how many channels they use`}
      </p>

      <div className="mt-3 mb-4 p-3 rounded-lg text-sm leading-relaxed" style={{ background: 'var(--sf-hover)', color: 'var(--sf-text)' }}>
        {tri.count > 0 && single.count > 0 ? (
          <>
            Members in all 3 channels average{' '}
            <strong style={{ color: 'var(--sf-accent-dark)' }}>{formatCompactCurrency(tri.avgSpend)}</strong> in spend —{' '}
            <strong style={{ color: 'var(--sf-accent-dark)' }}>{multiplier.toFixed(1)}×</strong>{' '}
            {dashboardChannel === 'all' ? 'single-channel members' : `${CHANNEL_LABELS[dashboardChannel]}-only members`}{' '}
            ({formatCompactCurrency(single.avgSpend)}, {single.count} members).
          </>
        ) : (
          <>Every additional channel a member uses multiplies their lifetime value.</>
        )}
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

// ---- Revenue at risk (segment revenue concentration) ----------------------

export function AtRiskRevenueWidget() {
  const { data, dashboardChannel } = useApp();
  const result = useMemo(
    () => (data ? computeSegmentRevenue(data.members, dashboardChannel) : null),
    [data, dashboardChannel]
  );
  if (!data || !result || result.rows.length === 0) return null;

  const maxRevenue = result.rows[0].revenue || 1;
  const recoverablePct = result.totalRevenue > 0 ? Math.round((result.recoverableRevenue / result.totalRevenue) * 100) : 0;

  return (
    <Card>
      <Title>Revenue at Risk</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        Where revenue concentrates by segment — at-risk segments highlighted
      </p>

      <div className="mt-3 mb-4 p-3 rounded-lg text-sm leading-relaxed" style={{ background: '#FFF3E0', color: 'var(--sf-text)' }}>
        <strong style={{ color: 'var(--sf-warning)' }}>{formatCompactCurrency(result.recoverableRevenue)} recoverable</strong>{' '}
        — {recoverablePct}% of revenue sits with {result.recoverableMembers} members in Big Spender at Risk or Almost Lost.
        Protect Champions; win these back first.
      </div>

      <div className="flex flex-col gap-2.5">
        {result.rows.map((row) => (
          <div key={row.segment} className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-3">
            <SegmentChip segment={row.segment} />
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--sf-surface)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, (row.revenue / maxRevenue) * 100)}%`,
                  background: row.atRisk ? 'var(--sf-warning)' : SEGMENT_COLORS[row.segment] || 'var(--sf-accent)',
                }}
              />
            </div>
            <div className="text-xs text-right whitespace-nowrap tabular-nums" style={{ color: 'var(--sf-text)' }}>
              <span className="font-semibold">{formatCompactCurrency(row.revenue)}</span>
              <span style={{ color: 'var(--sf-text-secondary)' }}> · {row.members}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Member value map (RFM scatter) ---------------------------------------

function ScatterTooltip({ active, payload }: CustomTooltipProps) {
  const point = payload?.[0]?.payload as { name?: string; segment?: string; visits?: number; spend?: number } | undefined;
  if (!active || !point?.name) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: 'white', border: '1px solid var(--sf-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
    >
      <div className="font-semibold mb-1 whitespace-nowrap" style={{ color: 'var(--sf-primary)' }}>{point.name}</div>
      <div style={{ color: 'var(--sf-text-secondary)' }}>{point.segment}</div>
      <div className="mt-1 whitespace-nowrap" style={{ color: 'var(--sf-text)' }}>
        {point.visits} visits · <span className="font-semibold">{formatCurrency(point.spend ?? 0)}</span>
      </div>
    </div>
  );
}

export function RfmScatterChart() {
  const { data, transactions, dashboardChannel } = useApp();
  const points = useMemo(
    () => (data && transactions ? computeRfmScatter(data.members, transactions.headers, dashboardChannel) : []),
    [data, transactions, dashboardChannel]
  );
  if (!data || !transactions || points.length === 0) return null;

  // Stable segment→color mapping: order points by fixed segment order so
  // Tremor assigns colors deterministically.
  const segmentsPresent = SEGMENT_ORDER.filter((s) => points.some((p) => p.segment === s));
  const sorted = [...points].sort(
    (a, b) => segmentsPresent.indexOf(a.segment) - segmentsPresent.indexOf(b.segment)
  );
  const colors = segmentsPresent.map((s) => SEGMENT_TREMOR_COLORS[s] || 'slate');

  return (
    <Card>
      <Title>Member Value Map</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        Visits vs spend — every bubble is a member; size = spend, color = segment. Whales top-right, at-risk clusters in amber.
      </p>
      <ScatterChart
        className="mt-4 h-80"
        data={sorted}
        x="visits"
        y="spend"
        size="spend"
        category="segment"
        colors={colors}
        valueFormatter={{ x: (v) => `${v}`, y: formatCompactCurrency, size: formatCompactCurrency }}
        yAxisWidth={75}
        xAxisLabel="Visits (transactions)"
        showLegend={false}
        customTooltip={ScatterTooltip}
      />
      <WrappingLegend items={segmentsPresent.map((name) => ({ name }))} />
    </Card>
  );
}

// ---- Cross-shop overlap ----------------------------------------------------

export function CrossShopWidget() {
  const { data, transactions, dashboardChannel } = useApp();
  const result = useMemo(
    () => (data && transactions ? computeCrossShop(data.members, transactions.headers, dashboardChannel, CHANNEL_LABELS) : null),
    [data, transactions, dashboardChannel]
  );
  if (!data || !transactions || !result) return null;

  const maxMembers = Math.max(...result.overlaps.map((o) => o.members), 1);

  return (
    <Card>
      <Title>Cross-Channel Cross-Shop</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        How members overlap across Golf, Retail, and F&B — the bundling opportunity
      </p>

      <div className="mt-3 mb-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--sf-hover)', color: 'var(--sf-accent-dark)' }}>
          <CalendarCheck size={13} strokeWidth={2} />
          {result.sameDayVisits} same-day cross-channel visits
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--sf-surface)', color: 'var(--sf-text-secondary)' }}>
          <Users size={13} strokeWidth={2} />
          {result.activeInScope} members in scope
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {result.overlaps.map((o) => (
          <div key={o.label} className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
            <div className="text-xs font-medium truncate" style={{ color: 'var(--sf-text)' }} title={o.label}>{o.label}</div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--sf-surface)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (o.members / maxMembers) * 100)}%`, background: 'var(--sf-accent)' }}
              />
            </div>
            <div className="text-xs text-right whitespace-nowrap tabular-nums" style={{ color: 'var(--sf-text)' }}>
              <span className="font-semibold">{o.members}</span>
              <span style={{ color: 'var(--sf-text-secondary)' }}> · avg {formatCompactCurrency(o.avgSpend)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---- Top items --------------------------------------------------------------

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

export function TopItemsChart() {
  const { transactions, dashboardChannel } = useApp();
  const topItems = useMemo(
    () => (transactions ? getTopItemsByRevenue(scopeItems(transactions.items, dashboardChannel), 10) : []),
    [transactions, dashboardChannel]
  );
  if (!transactions || topItems.length === 0) return null;

  const chartData = topItems.map((i) => ({ name: truncateName(i.name, 30), Revenue: i.revenue }));

  return (
    <Card>
      <Title>Top Items by Revenue</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        {dashboardChannel === 'all' ? 'Across Golf, Retail, and F&B' : `${CHANNEL_LABELS[dashboardChannel]} only`} — hover a bar for details
      </p>
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

// ---- Top members -------------------------------------------------------------

export function TopMembersBySpend() {
  const { data, dashboardChannel } = useApp();
  const top = useMemo(() => {
    if (!data) return [];
    return data.members
      .filter((m) => memberActiveIn(m, dashboardChannel))
      .map((m) => ({ member: m, spend: memberSpendFor(m, dashboardChannel) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10);
  }, [data, dashboardChannel]);
  if (!data || top.length === 0) return null;

  const chartData = top.map(({ member, spend }) => ({
    name: truncateName(getMemberName(member)),
    Spend: Math.round(spend),
  }));

  return (
    <Card>
      <Title>Top Members by Spend</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        {dashboardChannel === 'all' ? 'Lifetime spend across all channels' : `${CHANNEL_LABELS[dashboardChannel]} spend`} — hover a bar for details
      </p>
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

// ---- Spend trend ---------------------------------------------------------------

function formatMonthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const TREND_KEYS: { key: ChannelName; label: string }[] = [
  { key: 'golf', label: 'Golf' },
  { key: 'retail', label: 'Retail' },
  { key: 'food', label: 'F&B' },
];

// In 'all' mode retail's scale dwarfs golf/F&B into flat lines, so each
// channel is indexed to its own monthly average (100 = that channel's
// average month). The tooltip still shows real SAR values.
function IndexedTrendTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: 'white', border: '1px solid var(--sf-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
    >
      <div className="font-semibold mb-1 whitespace-nowrap" style={{ color: 'var(--sf-primary)' }}>{label}</div>
      {payload.map((p, i) => {
        const row = p.payload as Record<string, number>;
        const raw = row[`__raw_${p.name}`];
        return (
          <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {p.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />}
            <span style={{ color: 'var(--sf-text-secondary)' }}>{p.name}:</span>
            <span className="font-semibold" style={{ color: 'var(--sf-text)' }}>{formatCompactCurrency(raw ?? 0)}</span>
            <span style={{ color: 'var(--sf-text-secondary)' }}>(index {Math.round(Number(p.value))})</span>
          </div>
        );
      })}
    </div>
  );
}

export function SpendTrendChart() {
  const { transactions, dashboardChannel } = useApp();
  const monthly = useMemo(() => (transactions ? computeMonthlySpendTrend(transactions.headers) : []), [transactions]);
  if (!transactions || monthly.length === 0) return null;

  if (dashboardChannel !== 'all') {
    const label = TREND_KEYS.find((t) => t.key === dashboardChannel)!.label;
    const chartData = monthly.map((m) => ({ month: formatMonthLabel(m.month), [label]: m[dashboardChannel] }));
    return (
      <Card>
        <Title>Spend Trend</Title>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>Monthly {CHANNEL_LABELS[dashboardChannel]} spend</p>
        <LineChart
          className="mt-4 h-64"
          data={chartData}
          index="month"
          categories={[label]}
          colors={[dashboardChannel === 'golf' ? 'green' : dashboardChannel === 'retail' ? 'blue' : 'amber']}
          valueFormatter={formatCompactCurrency}
          yAxisWidth={70}
          customTooltip={CurrencyTooltip}
        />
      </Card>
    );
  }

  // All-channels mode: index each channel to its own monthly average so all
  // three trends are legible on one axis.
  const avgs: Record<ChannelName, number> = { golf: 0, retail: 0, food: 0 };
  for (const key of ['golf', 'retail', 'food'] as ChannelName[]) {
    const sum = monthly.reduce((s, m) => s + m[key], 0);
    avgs[key] = sum / monthly.length || 1;
  }
  const chartData = monthly.map((m) => {
    const row: Record<string, number | string> = { month: formatMonthLabel(m.month) };
    for (const { key, label } of TREND_KEYS) {
      row[label] = Math.round((m[key] / avgs[key]) * 100);
      row[`__raw_${label}`] = m[key];
    }
    return row;
  });

  return (
    <Card>
      <Title>Spend Trend</Title>
      <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
        Monthly, indexed to each channel&apos;s average (100 = channel average) so all three are legible — hover for real SAR
      </p>
      <LineChart
        className="mt-4 h-64"
        data={chartData}
        index="month"
        categories={TREND_KEYS.map((t) => t.label)}
        colors={['green', 'blue', 'amber']}
        valueFormatter={(v) => `${v}`}
        yAxisWidth={45}
        customTooltip={IndexedTrendTooltip}
      />
    </Card>
  );
}
