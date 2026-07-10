'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell,
} from '@tremor/react';
import { useApp } from '@/lib/store';
import { formatCurrency, getMemberName, getMemberInitials } from '@/lib/data';
import { useRouter } from 'next/navigation';
import type { Member, ChannelName } from '@/types';
import { SEGMENT_COLORS, SEGMENT_FIELD_BY_TAB } from '@/types';

const PAGE_SIZE = 20;

function RFMBadge({ score }: { score: number }) {
  const digits = String(score).padStart(3, '0').split('');
  return (
    <span className="rfm-score-cell">
      {digits.map((d, i) => (
        <span key={i} className={`rfm-digit rfm-${d}`} title={`${['Recency', 'Frequency', 'Monetary'][i]}: ${d}/4`}>{d}</span>
      ))}
    </span>
  );
}

const SORT_FIELDS: Record<string, { label: string; getValue: (m: Member) => number | string }> = {
  total_spend: { label: 'Total Spend', getValue: (m) => m.total_spend },
  name: { label: 'Name', getValue: (m) => getMemberName(m) },
  general_segment: { label: 'Segment', getValue: (m) => m.general_segment },
  golf: { label: 'Golf RFM', getValue: (m) => m.golf.score },
  retail: { label: 'Retail RFM', getValue: (m) => m.retail.score },
  food: { label: 'Food RFM', getValue: (m) => m.food.score },
  rfm: { label: 'RFM Score', getValue: (m) => m.general.score },
};

export default function MemberTable() {
  const { data, filters, setFilters, setSelectedMember, tableAnchorRef, persistStateForNavigation } = useApp();
  const router = useRouter();
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data.members];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          getMemberName(m).toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
      );
    }
    if (filters.segment) list = list.filter((m) => m[SEGMENT_FIELD_BY_TAB[filters.segmentTab]] === filters.segment);
    if (filters.channel) list = list.filter((m) => m[filters.channel as ChannelName].score > 0);
    if (filters.riskOnly) list = list.filter((m) => m.flagged);
    if (filters.buyingOnly) list = list.filter((m) => m.total_spend > 0);
    if (filters.recencyScore !== null) list = list.filter((m) => m.general.r === filters.recencyScore);

    const sf = SORT_FIELDS[filters.sortBy] || SORT_FIELDS.total_spend;
    list.sort((a, b) => {
      const va = sf.getValue(a);
      const vb = sf.getValue(b);
      const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return filters.sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [data, filters]);

  useEffect(() => { setPage(0); }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
      <TableHeaderCell
        className="cursor-pointer select-none whitespace-nowrap"
        onClick={() => toggleSort(field)}
      >
        {children}
        {active && <span className="ml-1">{filters.sortDir === 'asc' ? '▲' : '▼'}</span>}
      </TableHeaderCell>
    );
  }

  if (!data) return null;

  return (
    <div ref={tableAnchorRef} id="members" className="scroll-mt-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Member Directory</span>
            <span className="text-xs ml-2" style={{ color: 'var(--sf-text-secondary)' }}>
              Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} members
            </span>
          </div>
        </div>

        <div className="overflow-x-auto" style={{ maxHeight: 560 }}>
          <Table>
            <TableHead>
              <TableRow>
                <SortHeader field="name">Member</SortHeader>
                <SortHeader field="general_segment">Segment</SortHeader>
                <SortHeader field="golf">Golf RFM</SortHeader>
                <SortHeader field="retail">Retail RFM</SortHeader>
                <SortHeader field="food">Food RFM</SortHeader>
                <SortHeader field="rfm">General RFM</SortHeader>
                <SortHeader field="total_spend">Total Spend</SortHeader>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.map((m) => (
                <TableRow
                  key={m.id}
                  className={`cursor-pointer hover:bg-cyan-50/40 transition-colors ${m.flagged ? 'at-risk-row' : ''}`}
                  onClick={() => setSelectedMember(m)}
                  onDoubleClick={() => { persistStateForNavigation(); router.push(`/member/${m.id}`); }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--sf-accent)' }}
                      >
                        {getMemberInitials(m)}
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
                  </TableCell>
                  <TableCell>
                    <span
                      className="slds-badge"
                      style={{ background: `${SEGMENT_COLORS[m.general_segment]}18`, color: SEGMENT_COLORS[m.general_segment] }}
                    >
                      {m.general_segment}
                    </span>
                  </TableCell>
                  <TableCell>{m.golf.score > 0 ? <RFMBadge score={m.golf.score} /> : <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>—</span>}</TableCell>
                  <TableCell>{m.retail.score > 0 ? <RFMBadge score={m.retail.score} /> : <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>—</span>}</TableCell>
                  <TableCell>{m.food.score > 0 ? <RFMBadge score={m.food.score} /> : <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>—</span>}</TableCell>
                  <TableCell><RFMBadge score={m.general.score} /></TableCell>
                  <TableCell className="text-sm font-medium" style={{ color: 'var(--sf-primary)' }}>
                    {formatCurrency(m.total_spend)}
                  </TableCell>
                  <TableCell>
                    {m.flagged ? (
                      <span className="slds-badge" style={{ background: '#FFF3E0', color: 'var(--sf-warning)' }}>Flagged</span>
                    ) : (
                      <span className="slds-badge" style={{ background: '#E8F5E9', color: 'var(--sf-success)' }}>Healthy</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: 'var(--sf-border)' }}>
          <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
              style={{ borderColor: 'var(--sf-border)', color: 'var(--sf-text)' }}
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
