'use client';

import { useMemo } from 'react';
import { useApp } from '@/lib/store';
import { formatCurrency, getMemberName } from '@/lib/data';
import { useRouter } from 'next/navigation';
import type { Member, ChannelName } from '@/types';
import { SEGMENT_COLORS } from '@/types';

function RFMBadge({ score }: { score: string }) {
  return (
    <span className="rfm-score-cell">
      {score.split('').map((d, i) => (
        <span key={i} className={`rfm-digit rfm-${d}`}>{d}</span>
      ))}
    </span>
  );
}

const SORT_FIELDS: Record<string, { label: string; getValue: (m: Member) => number | string }> = {
  totalMonetary: { label: 'Lifetime Value', getValue: (m) => m.general.totalMonetary },
  name: { label: 'Name', getValue: (m) => getMemberName(m) },
  segment: { label: 'Segment', getValue: (m) => m.segment },
  rfm: { label: 'RFM Score', getValue: (m) => m.general.rfmScore },
  channels: { label: 'Channels', getValue: (m) => [m.channels.golf, m.channels.retail, m.channels.food].filter(Boolean).length },
};

export default function MemberTable() {
  const { data, filters, setFilters, setSelectedMember } = useApp();
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data.members];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          getMemberName(m).toLowerCase().includes(q) ||
          m.email.includes(q) ||
          m.id.toLowerCase().includes(q) ||
          (m.membershipNo && m.membershipNo.includes(q))
      );
    }

    if (filters.segment) {
      list = list.filter((m) => m.segment === filters.segment);
    }

    if (filters.channel) {
      list = list.filter((m) => m.channels[filters.channel as ChannelName]);
    }

    if (filters.riskOnly) {
      list = list.filter((m) => m.atRisk);
    }

    const sf = SORT_FIELDS[filters.sortBy] || SORT_FIELDS.totalMonetary;
    list.sort((a, b) => {
      const va = sf.getValue(a);
      const vb = sf.getValue(b);
      const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return filters.sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [data, filters]);

  function toggleSort(key: string) {
    if (filters.sortBy === key) {
      setFilters({ ...filters, sortDir: filters.sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      setFilters({ ...filters, sortBy: key, sortDir: 'desc' });
    }
  }

  function SortHeader({ field, children }: { field: string; children: React.ReactNode }) {
    const active = filters.sortBy === field;
    return (
      <th
        className="text-left py-2 px-3 text-xs font-semibold cursor-pointer select-none hover:bg-gray-50"
        style={{ color: 'var(--sf-text-secondary)' }}
        onClick={() => toggleSort(field)}
      >
        {children}
        {active && <span className="ml-1">{filters.sortDir === 'asc' ? '▲' : '▼'}</span>}
      </th>
    );
  }

  if (!data) return null;

  return (
    <div className="slds-card" id="members">
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--sf-border)' }}>
        <div>
          <span className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Member Directory</span>
          <span className="text-xs ml-2" style={{ color: 'var(--sf-text-secondary)' }}>
            {filtered.length} of {data.members.length} members
          </span>
        </div>
      </div>

      <div className="overflow-x-auto" style={{ maxHeight: 480 }}>
        <table className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr style={{ borderBottom: '2px solid var(--sf-border)' }}>
              <SortHeader field="name">Member</SortHeader>
              <SortHeader field="segment">Segment</SortHeader>
              <SortHeader field="rfm">General RFM</SortHeader>
              <SortHeader field="channels">Channels</SortHeader>
              <SortHeader field="totalMonetary">Lifetime Value</SortHeader>
              <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--sf-text-secondary)' }}>Status</th>
              <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--sf-text-secondary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--sf-border)' }}
                onClick={() => setSelectedMember(m)}
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'var(--sf-secondary)' }}
                    >
                      {(m.firstName?.[0] || '?')}{(m.lastName?.[0] || '')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--sf-primary)' }}>
                        {getMemberName(m)}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--sf-text-secondary)' }}>
                        {m.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <span
                    className="slds-badge"
                    style={{ background: `${SEGMENT_COLORS[m.segment]}15`, color: SEGMENT_COLORS[m.segment] }}
                  >
                    {m.segment}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <RFMBadge score={m.general.rfmScore} />
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1">
                    {m.channels.golf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">G</span>}
                    {m.channels.retail && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">R</span>}
                    {m.channels.food && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">F</span>}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-sm font-medium" style={{ color: 'var(--sf-primary)' }}>
                  {formatCurrency(m.general.totalMonetary)}
                </td>
                <td className="py-2.5 px-3">
                  {m.atRisk ? (
                    <span className="slds-badge" style={{ background: '#FEE2E2', color: 'var(--sf-error)' }}>
                      At Risk
                    </span>
                  ) : (
                    <span className="slds-badge" style={{ background: '#DCFCE7', color: 'var(--sf-success)' }}>
                      Healthy
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/member/${m.id}`);
                    }}
                    className="text-xs font-medium px-2.5 py-1 rounded hover:bg-blue-100 transition-colors"
                    style={{ color: 'var(--sf-secondary)' }}
                  >
                    View 360
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
