'use client';

import { useMemo } from 'react';
import { Card, Metric, Text, Flex } from '@tremor/react';
import { useApp } from '@/lib/store';
import { formatCurrency, formatNumber } from '@/lib/data';
import { computeSummary } from '@/types';
import { defaultFilters } from '@/lib/store';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  onClick?: () => void;
}

function KPICard({ label, value, sub, icon, onClick }: KPICardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
      onClick={onClick}
      decoration="top"
      decorationColor="cyan"
    >
      <Flex justifyContent="between" alignItems="start">
        <div className="min-w-0">
          <Text className="truncate">{label}</Text>
          <Metric className="mt-1" style={{ color: 'var(--sf-accent-dark)' }}>{value}</Metric>
          {sub && <Text className="mt-1 text-xs truncate">{sub}</Text>}
        </div>
        <div className="text-xl flex-shrink-0">{icon}</div>
      </Flex>
    </Card>
  );
}

export default function KPICards() {
  const { data, setFilters, setView, scrollToTable } = useApp();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  function goToMembers(partial: Partial<typeof defaultFilters>) {
    setFilters({ ...defaultFilters, ...partial });
    setView('members');
    scrollToTable();
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      <KPICard
        label="Buying Members"
        value={formatNumber(summary.buyingMembers)}
        sub={`${Math.round((summary.buyingMembers / summary.totalMembers) * 100)}% of profiles`}
        icon="🛒"
        onClick={() => goToMembers({ buyingOnly: true })}
      />
      <KPICard
        label="Champions"
        value={formatNumber(summary.championMembers)}
        sub="Highest RFM tier"
        icon="🏆"
        onClick={() => goToMembers({ segment: 'Champion' })}
      />
      <KPICard
        label="Members At Risk"
        value={formatNumber(summary.flaggedMembers)}
        sub="Big Spender at Risk flag"
        icon="⚠️"
        onClick={() => goToMembers({ riskOnly: true })}
      />
      <KPICard
        label="Total Sales"
        value={formatCurrency(summary.totalSales)}
        sub="Across Golf, Retail, F&B"
        icon="💰"
        onClick={() => goToMembers({})}
      />
      <KPICard
        label="Avg. Frequency Score"
        value={summary.avgFrequencyScore.toFixed(1)}
        sub="General F-score (1-4)"
        icon="🔁"
        onClick={() => goToMembers({})}
      />
      <KPICard
        label="Avg. Spend / Member"
        value={formatCurrency(summary.avgTotalSpend)}
        sub="Total spend / profile"
        icon="📈"
        onClick={() => goToMembers({})}
      />
    </div>
  );
}
