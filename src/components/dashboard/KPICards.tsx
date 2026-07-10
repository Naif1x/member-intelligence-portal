'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { formatCurrency, formatNumber } from '@/lib/data';
import { computeSummary } from '@/types';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
}

function KPICard({ label, value, sub, color, icon }: KPICardProps) {
  return (
    <div className="slds-card p-4 flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium" style={{ color: 'var(--sf-text-secondary)' }}>
          {label}
        </div>
        <div className="text-xl font-bold mt-0.5" style={{ color: 'var(--sf-primary)' }}>
          {value}
        </div>
        {sub && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KPICards() {
  const { data } = useApp();
  const summary = useMemo(() => (data ? computeSummary(data.members) : null), [data]);
  if (!data || !summary) return null;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <KPICard
        label="Unified Profiles"
        value={formatNumber(summary.totalMembers)}
        sub={`From ${data.metadata.total_source_records} source records`}
        color="var(--sf-secondary)"
        icon="👥"
      />
      <KPICard
        label="Golf Coverage"
        value={formatNumber(summary.channelCoverage.golf)}
        sub={`${Math.round((summary.channelCoverage.golf / summary.totalMembers) * 100)}% of members`}
        color="var(--sf-success)"
        icon="⛳"
      />
      <KPICard
        label="Flagged Members"
        value={formatNumber(summary.flaggedMembers)}
        sub="Big Spender at Risk in any channel"
        color="var(--sf-error)"
        icon="⚠"
      />
      <KPICard
        label="Avg. Total Spend"
        value={formatCurrency(summary.avgTotalSpend)}
        sub="Across all channels"
        color="var(--sf-warning)"
        icon="$"
      />
    </div>
  );
}
