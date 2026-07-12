'use client';

import { useMemo } from 'react';
import { Card } from '@heroui/react';
import { Users, AlertTriangle, Trophy, Wallet, TrendingUp, type LucideIcon } from 'lucide-react';
import { useApp, type DashboardChannel } from '@/lib/store';
import { formatCompactCurrency, formatNumber } from '@/lib/data';
import { CHANNEL_LABELS, type Member } from '@/types';
import { memberActiveIn, memberSpendFor, memberSegmentFor } from '@/lib/transactions';

interface ScopedSummary {
  members: number;
  atRisk: number;
  champions: number;
  totalSpend: number;
  avgSpend: number;
}

function computeScoped(members: Member[], ch: DashboardChannel): ScopedSummary {
  let count = 0, atRisk = 0, champions = 0, totalSpend = 0;
  for (const m of members) {
    if (!memberActiveIn(m, ch)) continue;
    count++;
    const segment = memberSegmentFor(m, ch);
    if (ch === 'all' ? m.flagged : segment === 'Big Spender at Risk') atRisk++;
    if (segment === 'Champion') champions++;
    totalSpend += memberSpendFor(m, ch);
  }
  return {
    members: count,
    atRisk,
    champions,
    totalSpend: Math.round(totalSpend),
    avgSpend: count ? Math.round(totalSpend / count) : 0,
  };
}

function KPICard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: LucideIcon }) {
  return (
    <Card className="border-t-4" style={{ borderTopColor: 'var(--sf-accent)' }}>
      <Card.Content className="p-4">
        <div className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0 text-sm leading-tight min-h-[2.25rem] flex items-start" style={{ color: 'var(--sf-text-secondary)' }}>{label}</div>
          <Icon size={20} strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--sf-accent)' }} />
        </div>
        <div className="text-2xl font-semibold" style={{ color: 'var(--sf-accent-dark)' }}>{value}</div>
        <div className="mt-1 text-xs min-h-[1rem]" style={{ color: 'var(--sf-text-secondary)' }}>{sub}</div>
      </Card.Content>
    </Card>
  );
}

export default function KPICards() {
  const { data, dashboardChannel } = useApp();
  const summary = useMemo(
    () => (data ? computeScoped(data.members, dashboardChannel) : null),
    [data, dashboardChannel]
  );
  if (!data || !summary) return null;

  const scopeLabel = dashboardChannel === 'all' ? 'Across Golf, Retail, F&B' : `${CHANNEL_LABELS[dashboardChannel]} channel`;
  const membersLabel = dashboardChannel === 'all' ? 'Total Members' : 'Active Members';
  const membersSub = dashboardChannel === 'all' ? 'Unified D360 profiles' : `Active in ${CHANNEL_LABELS[dashboardChannel]}`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <KPICard label={membersLabel} value={formatNumber(summary.members)} sub={membersSub} icon={Users} />
      <KPICard label="Members At Risk" value={formatNumber(summary.atRisk)} sub="Big Spender at Risk" icon={AlertTriangle} />
      <KPICard label="Champions" value={formatNumber(summary.champions)} sub="Highest engagement tier" icon={Trophy} />
      <KPICard label="Total Spend" value={formatCompactCurrency(summary.totalSpend)} sub={scopeLabel} icon={Wallet} />
      <KPICard label="Avg. Spend / Member" value={formatCompactCurrency(summary.avgSpend)} sub="Spend / active member" icon={TrendingUp} />
    </div>
  );
}
