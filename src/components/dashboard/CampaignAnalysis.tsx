'use client';

import { useMemo } from 'react';
import { Button, Card, Table } from '@heroui/react';
import { useApp, defaultFilters } from '@/lib/store';
import { formatCurrency } from '@/lib/data';
import { SEGMENT_ACTIONS } from '@/types';
import SegmentChip from '@/components/ui/SegmentChip';

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
      <Card.Header className="flex flex-col items-start gap-0.5 pb-0">
        <Card.Title className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Campaign Analysis by Segment</Card.Title>
        <Card.Description className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
          Aggregated spend and recommended campaign action per D360 segment
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Table>
          <Table.ScrollContainer className="overflow-x-auto">
            <Table.Content aria-label="Campaign analysis by segment">
              <Table.Header>
                <Table.Column isRowHeader>Segment</Table.Column>
                <Table.Column>Members</Table.Column>
                <Table.Column>Total Spend</Table.Column>
                <Table.Column>Avg. Spend</Table.Column>
                <Table.Column>Recommended Action</Table.Column>
                <Table.Column>Actions</Table.Column>
              </Table.Header>
              <Table.Body items={rows.map((r) => ({ ...r, id: r.segment }))}>
                {(row) => (
                  <Table.Row id={row.segment}>
                    <Table.Cell><SegmentChip segment={row.segment} /></Table.Cell>
                    <Table.Cell>{row.count}</Table.Cell>
                    <Table.Cell>
                      <span className="font-medium" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(row.totalSpend)}</span>
                    </Table.Cell>
                    <Table.Cell>{formatCurrency(row.avgSpend)}</Table.Cell>
                    <Table.Cell>
                      <span className="text-xs max-w-xs block" style={{ color: 'var(--sf-text-secondary)' }}>{row.action}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            setFilters({ ...defaultFilters, segments: [row.segment], segmentTab: 'general' });
                            setView('members');
                            scrollToTable();
                          }}
                          style={{ color: 'var(--sf-accent-dark)' }}
                        >
                          View Members
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => openChatWithContext(`Generate a campaign brief for the "${row.segment}" segment (${row.count} members, ${formatCurrency(row.totalSpend)} total spend).`)}
                          style={{ color: 'var(--sf-accent-dark)' }}
                        >
                          Ask Agentforce
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card.Content>
    </Card>
  );
}
