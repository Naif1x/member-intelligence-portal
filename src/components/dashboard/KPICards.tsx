'use client';

import { useMemo } from 'react';
import { Card, Metric, Text, Flex } from '@tremor/react';
import { useApp } from '@/lib/store';
import { formatCurrency, formatNumber } from '@/lib/data';
import { computeSummary, type DataSummary } from '@/types';
import { defaultFilters, type FilterState } from '@/lib/store';

interface KPIDefinition {
  id: string;
  label: string;
  icon: string;
  getValue: (summary: DataSummary) => string;
  getSub?: (summary: DataSummary) => string;
  filter?: Partial<FilterState>;
}

const KPI_DEFINITIONS: KPIDefinition[] = [
  {
    id: 'total-members',
    label: 'Total Members',
    icon: '👥',
    getValue: (s) => formatNumber(s.totalMembers),
    getSub: () => 'Unified D360 profiles',
    filter: {},
  },
  {
    id: 'members-at-risk',
    label: 'Members At Risk',
    icon: '⚠️',
    getValue: (s) => formatNumber(s.flaggedMembers),
    getSub: () => 'Big Spender at Risk flag',
    filter: { riskOnly: true },
  },
  {
    id: 'champions',
    label: 'Champions',
    icon: '🏆',
    getValue: (s) => formatNumber(s.championMembers),
    getSub: () => 'Highest RFM tier',
    filter: { segment: 'Champion', segmentTab: 'general' },
  },
  {
    id: 'total-spend',
    label: 'Total Spend',
    icon: '💰',
    getValue: (s) => formatCurrency(s.totalSales),
    getSub: () => 'Across Golf, Retail, F&B',
    filter: {},
  },
  {
    id: 'avg-spend-per-member',
    label: 'Avg. Spend / Member',
    icon: '📈',
    getValue: (s) => formatCurrency(s.avgTotalSpend),
    getSub: () => 'Total spend / profile',
    filter: {},
  },
];

function KPICard({ label, value, sub, icon, onClick }: { label: string; value: string; sub?: string; icon: string; onClick?: () => void }) {
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

  function goToMembers(partial: Partial<FilterState>) {
    setFilters({ ...defaultFilters, ...partial });
    setView('members');
    scrollToTable();
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {KPI_DEFINITIONS.map((kpi) => (
        <KPICard
          key={kpi.id}
          label={kpi.label}
          value={kpi.getValue(summary)}
          sub={kpi.getSub?.(summary)}
          icon={kpi.icon}
          onClick={() => goToMembers(kpi.filter ?? {})}
        />
      ))}
    </div>
  );
}
