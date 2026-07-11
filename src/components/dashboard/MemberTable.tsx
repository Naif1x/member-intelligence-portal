'use client';

import { useMemo, useState } from 'react';
import { Avatar, Button, Card, Chip, Table } from '@heroui/react';
import type { SortDescriptor } from 'react-aria-components';
import { useApp } from '@/lib/store';
import { formatCurrency, getMemberName, getMemberInitials } from '@/lib/data';
import type { Member, ChannelName } from '@/types';
import { SEGMENT_FIELD_BY_TAB } from '@/types';
import SegmentChip from '@/components/ui/SegmentChip';

const PAGE_SIZE = 20;

const SORT_FIELDS: Record<string, (m: Member) => number | string> = {
  name: (m) => getMemberName(m),
  golf_segment: (m) => m.golf_segment,
  retail_segment: (m) => m.retail_segment,
  food_segment: (m) => m.food_segment,
  general_segment: (m) => m.general_segment,
  total_spend: (m) => m.total_spend,
};

const COLUMNS: { id: string; label: string; sortable: boolean }[] = [
  { id: 'name', label: 'Member', sortable: true },
  { id: 'golf_segment', label: 'Golf Segment', sortable: true },
  { id: 'retail_segment', label: 'Retail Segment', sortable: true },
  { id: 'food_segment', label: 'Food Segment', sortable: true },
  { id: 'general_segment', label: 'General Segment', sortable: true },
  { id: 'total_spend', label: 'Total Spend', sortable: true },
  { id: 'status', label: 'Status', sortable: false },
];

function ChannelSegmentCell({ member, channel }: { member: Member; channel: ChannelName }) {
  const segment = member[SEGMENT_FIELD_BY_TAB[channel]] as string;
  return <SegmentChip segment={segment || 'No Data'} />;
}

export default function MemberTable() {
  const { data, filters, setFilters, setSelectedMember, tableAnchorRef } = useApp();
  const [page, setPage] = useState(0);
  const [prevFilters, setPrevFilters] = useState(filters);

  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(0);
  }

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
    if (filters.segments.length) {
      const field = SEGMENT_FIELD_BY_TAB[filters.segmentTab];
      list = list.filter((m) => filters.segments.includes(m[field] as string));
    }
    if (filters.channels.length) {
      list = list.filter((m) => {
        const active = filters.channels.map((c) => m[c].score > 0);
        return filters.channelMode === 'all' ? active.every(Boolean) : active.some(Boolean);
      });
    }
    if (filters.spendMin !== null) list = list.filter((m) => m.total_spend >= filters.spendMin!);
    if (filters.spendMax !== null) list = list.filter((m) => m.total_spend <= filters.spendMax!);
    if (filters.gender) list = list.filter((m) => m.gender === filters.gender);
    if (filters.riskOnly) list = list.filter((m) => m.flagged);
    if (filters.buyingOnly) list = list.filter((m) => m.total_spend > 0);

    const getValue = SORT_FIELDS[filters.sortBy] || SORT_FIELDS.total_spend;
    list.sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === 'number' ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
      return filters.sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [data, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const sortDescriptor: SortDescriptor = {
    column: filters.sortBy,
    direction: filters.sortDir === 'asc' ? 'ascending' : 'descending',
  };

  function onSortChange(d: SortDescriptor) {
    setFilters({
      ...filters,
      sortBy: String(d.column),
      sortDir: d.direction === 'ascending' ? 'asc' : 'desc',
    });
  }

  if (!data) return null;

  return (
    <div ref={tableAnchorRef} id="members" className="scroll-mt-4">
      <Card>
        <Card.Header className="flex flex-row items-baseline gap-2 pb-0">
          <Card.Title className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Member Directory</Card.Title>
          <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
            Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} members
          </span>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.ScrollContainer className="max-h-[560px] overflow-auto">
              <Table.Content
                aria-label="Member directory"
                sortDescriptor={sortDescriptor}
                onSortChange={onSortChange}
                onRowAction={(key) => {
                  const m = filtered.find((x) => x.id === key);
                  if (m) setSelectedMember(m);
                }}
              >
                <Table.Header>
                  {COLUMNS.map((col) => (
                    <Table.Column key={col.id} id={col.id} allowsSorting={col.sortable} isRowHeader={col.id === 'name'}>
                      {({ sortDirection }) => (
                        <Table.SortableColumnHeader sortDirection={sortDirection} showIndicator={col.sortable}>
                          {col.label}
                        </Table.SortableColumnHeader>
                      )}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body items={pageItems}>
                  {(m) => (
                    <Table.Row
                      id={m.id}
                      className={`cursor-pointer hover:bg-cyan-50/40 transition-colors ${m.flagged ? 'at-risk-row' : ''}`}
                    >
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" className="flex-shrink-0" style={{ background: 'var(--sf-accent)' }}>
                            <Avatar.Fallback className="bg-transparent text-white text-xs font-bold">
                              {getMemberInitials(m)}
                            </Avatar.Fallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--sf-primary)' }}>
                              {getMemberName(m)}
                            </div>
                            <div className="text-[11px] truncate" style={{ color: 'var(--sf-text-secondary)' }}>
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell><ChannelSegmentCell member={m} channel="golf" /></Table.Cell>
                      <Table.Cell><ChannelSegmentCell member={m} channel="retail" /></Table.Cell>
                      <Table.Cell><ChannelSegmentCell member={m} channel="food" /></Table.Cell>
                      <Table.Cell><SegmentChip segment={m.general_segment} /></Table.Cell>
                      <Table.Cell>
                        <span className="text-sm font-medium" style={{ color: 'var(--sf-primary)' }}>
                          {formatCurrency(m.total_spend)}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        {m.flagged ? (
                          <Chip size="sm" color="warning" variant="soft">Flagged</Chip>
                        ) : (
                          <Chip size="sm" color="success" variant="soft">Healthy</Chip>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          {/* Pagination — right-padded so the fixed chat FAB never overlaps Next */}
          <div className="flex items-center justify-between mt-4 pt-3 pr-16 border-t" style={{ borderColor: 'var(--sf-border)' }}>
            <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                isDisabled={page === 0}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                isDisabled={page >= totalPages - 1}
                onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
