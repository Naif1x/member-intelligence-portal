'use client';

import { useApp } from '@/lib/store';
import { formatCurrency, formatNumber } from '@/lib/data';

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
  if (!data) return null;
  const s = data.summary;

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <KPICard
        label="Total Members"
        value={formatNumber(s.totalMembers)}
        sub={`${s.systemsCoverage.LSGolf} from Golf · ${s.systemsCoverage.LSRetail} from Retail`}
        color="var(--sf-secondary)"
        icon="👥"
      />
      <KPICard
        label="Active Subscriptions"
        value={formatNumber(s.activeSubscriptions)}
        sub={`${Math.round((s.activeSubscriptions / s.totalMembers) * 100)}% of members`}
        color="var(--sf-success)"
        icon="✓"
      />
      <KPICard
        label="At-Risk Members"
        value={formatNumber(s.atRiskMembers)}
        sub="R≤2 & M≥3 in any channel"
        color="var(--sf-error)"
        icon="⚠"
      />
      <KPICard
        label="Avg. Lifetime Value"
        value={formatCurrency(s.avgLifetimeValue)}
        sub="Across all channels"
        color="var(--sf-warning)"
        icon="$"
      />
    </div>
  );
}
