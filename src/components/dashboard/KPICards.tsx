'use client';

import { useMemo } from 'react';
import { Card } from '@heroui/react';
import { useApp } from '@/lib/store';
import { formatCompactCurrency, formatNumber } from '@/lib/data';
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
    getSub: () => 'Highest engagement tier',
    filter: { segment: 'Champion', segmentTab: 'general' },
  },
  {
    id: 'total-spend',
    label: 'Total Spend',
    icon: '💰',
    getValue: (s) => formatCompactCurrency(s.totalSales),
    getSub: () => 'Across Golf, Retail, F&B',
    filter: {},
  },
  {
    id: 'avg-spend-per-member',
    label: 'Avg. Spend / Member',
    icon: '📈',
    getValue: (s) => formatCompactCurrency(s.avgTotalSpend),
    getSub: () => 'Total spend / profile',
    filter: {},
  },
];

function KPICard({ label, value, sub, icon, onClick }: { label: string; value: string; sub?: string; icon: string; onClick?: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-t-4"
      style={{ borderTopColor: 'var(--sf-accent)' }}
    >
      <Card.Content className="p-4">
        <div className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0 text-sm leading-tight min-h-[2.25rem] flex items-start" style={{ color: 'var(--sf-text-secondary)' }}>{label}</div>
          <div className="text-xl flex-shrink-0">{icon}</div>
        </div>
        <div className="text-2xl font-semibold" style={{ color: 'var(--sf-accent-dark)' }}>{value}</div>
        <div className="mt-1 text-xs min-h-[1rem]" style={{ color: 'var(--sf-text-secondary)' }}>{sub}</div>
      </Card.Content>
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
