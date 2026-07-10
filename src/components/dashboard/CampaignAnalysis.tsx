'use client';

import { useMemo } from 'react';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell } from '@tremor/react';
import { useApp, defaultFilters } from '@/lib/store';
import { formatCurrency } from '@/lib/data';
import { SEGMENT_COLORS, SEGMENT_ACTIONS } from '@/types';

export default function CampaignAnalysis() {
  const { data, setFilters, setView, scrollToTable, openChatWithContext } = useApp();

  const rows = useMemo(() => {
    if (!data) return [];
    const bySegment: Record<string, { count: number; totalSpend: number }> = {};
    data.members.forEach((m) => {
      if (!bySegment[m.general_segment]) bySegment[m.general_segment] = { count: 0, totalSpend: 0 };
      bySegment[m.general_segment].count++;
      bySegment[m.general_segment].totalSpend += m.total_spend;
    });
    return Object.entries(bySegment)
      .map(([segment, v]) => ({
        segment,
        count: v.count,
        totalSpend: v.totalSpend,
        avgSpend: v.count ? v.totalSpend / v.count : 0,
        action: SEGMENT_ACTIONS[segment] || '',
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);
  }, [data]);

  if (!data) return null;

  return (
    <Card>
      <div className="mb-3">
        <span className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Campaign Analysis by Segment</span>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sf-text-secondary)' }}>
          Aggregated spend and recommended campaign action per D360 segment
        </p>
      </div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Segment</TableHeaderCell>
            <TableHeaderCell>Members</TableHeaderCell>
            <TableHeaderCell>Total Spend</TableHeaderCell>
            <TableHeaderCell>Avg. Spend</TableHeaderCell>
            <TableHeaderCell>Recommended Action</TableHeaderCell>
            <TableHeaderCell>Actions</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.segment}>
              <TableCell>
                <span
                  className="slds-badge"
                  style={{ background: `${SEGMENT_COLORS[row.segment]}18`, color: SEGMENT_COLORS[row.segment] }}
                >
                  {row.segment}
                </span>
              </TableCell>
              <TableCell>{row.count}</TableCell>
              <TableCell className="font-medium" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(row.totalSpend)}</TableCell>
              <TableCell>{formatCurrency(row.avgSpend)}</TableCell>
              <TableCell className="text-xs max-w-xs" style={{ color: 'var(--sf-text-secondary)' }}>{row.action}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setFilters({ ...defaultFilters, segment: row.segment });
                      setView('members');
                      scrollToTable();
                    }}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--sf-accent-dark)' }}
                  >
                    View Members
                  </button>
                  <button
                    onClick={() => openChatWithContext(`Generate a campaign brief for the "${row.segment}" segment (${row.count} members, ${formatCurrency(row.totalSpend)} total spend).`)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--sf-accent-dark)' }}
                  >
                    Ask Agentforce
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
