'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Chip } from '@heroui/react';
import type { Member, MemberData, ChannelName, ChannelMetrics } from '@/types';
import { CHANNEL_COLORS, getAtRiskChannels } from '@/types';
import { formatCurrency, getGenderLabel, getMemberInitials } from '@/lib/data';
import { getNextBestActions } from '@/lib/agentforce';
import { getMemberChannelActivity, type ActivityRow } from '@/lib/transactions';
import { motion, AnimatePresence } from 'framer-motion';
import SegmentChip from '@/components/ui/SegmentChip';
import { useApp } from '@/lib/store';

const ACTIVITY_PAGE_SIZE = 5;

function ChannelCard({
  channel, label, metrics, segment, activity, expanded, onToggle,
}: {
  channel: ChannelName; label: string; metrics: ChannelMetrics; segment: string;
  activity: ActivityRow[]; expanded: boolean; onToggle: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const hasData = metrics.score > 0 || metrics.spend > 0;

  if (!hasData) return (
    <Card className="opacity-50">
      <Card.Content className="p-4">
        <div className="text-sm font-bold mb-2" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
        <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>No activity in this channel</div>
      </Card.Content>
    </Card>
  );

  const hasMore = activity.length > ACTIVITY_PAGE_SIZE;
  const visibleRows = showAll ? activity : activity.slice(0, ACTIVITY_PAGE_SIZE);

  return (
    <Card>
      <Card.Content className="p-4">
        <button className="w-full text-left cursor-pointer" onClick={onToggle}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: CHANNEL_COLORS[channel] }}>
              {label}
              <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>{expanded ? '▲' : '▼'}</span>
            </div>
            <SegmentChip segment={segment} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Channel Spend</div>
            <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(metrics.spend)}</div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--sf-border)' }}>
                <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-secondary)' }}>
                  Recent Activity
                </div>
                {activity.length === 0 ? (
                  <div className="text-xs py-1" style={{ color: 'var(--sf-text-secondary)' }}>No transactions recorded in this channel.</div>
                ) : (
                  <>
                    <div className={showAll ? 'max-h-56 overflow-y-auto pr-1' : ''}>
                      {visibleRows.map((tx, i) => (
                        <div
                          key={tx.id}
                          className="flex items-center gap-2 py-1.5 text-xs"
                          style={{ borderBottom: i < visibleRows.length - 1 ? '1px solid var(--sf-border)' : 'none' }}
                        >
                          <span className="truncate flex-1 min-w-0" title={tx.label} style={{ color: 'var(--sf-text)' }}>
                            {tx.label}
                          </span>
                          <span className="flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--sf-text-secondary)' }}>{tx.daysAgo}d ago</span>
                          <span className="font-medium flex-shrink-0 whitespace-nowrap" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(tx.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setShowAll((v) => !v)}
                        className="mt-2 text-xs font-medium"
                        style={{ color: 'var(--sf-accent-dark)' }}
                      >
                        {showAll ? 'Show less ▲' : `Show ${activity.length - ACTIVITY_PAGE_SIZE} more ▼`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card.Content>
    </Card>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { transactions, setChatContextMember, openChatWithContext } = useApp();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedChannel, setExpandedChannel] = useState<ChannelName | null>(null);

  useEffect(() => {
    fetch('/data/d360_datagraph_export.json')
      .then(r => r.json())
      .then((data: MemberData) => {
        const found = data.members.find(m => m.id === id);
        setMember(found || null);
        setLoading(false);
      });
  }, [id]);

  // Lets the chat answer "tell me about this customer" correctly while
  // this page is open, without triggering the dashboard's right-panel
  // side effect that setSelectedMember carries.
  useEffect(() => {
    if (member) setChatContextMember(member);
    return () => setChatContextMember(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const activityByChannel = useMemo(() => {
    if (!member || !transactions) return null;
    const asOfDate = transactions.dateRange.max;
    const result: Record<ChannelName, ActivityRow[]> = {
      golf: getMemberChannelActivity(transactions.items, member.id, 'golf', asOfDate),
      retail: getMemberChannelActivity(transactions.items, member.id, 'retail', asOfDate),
      food: getMemberChannelActivity(transactions.items, member.id, 'food', asOfDate),
    };
    // Sanity check: activity rows should sum to the datagraph's channel
    // spend for this member (same reconciliation verified dataset-wide).
    if (process.env.NODE_ENV !== 'production') {
      (['golf', 'retail', 'food'] as ChannelName[]).forEach((ch) => {
        const sum = result[ch].reduce((s, r) => s + r.amount, 0);
        const diff = Math.abs(sum - member[ch].spend);
        if (diff > 1) {
          console.warn(`[member/${member.id}] ${ch} activity sum (${sum}) != datagraph spend (${member[ch].spend})`);
        }
      });
    }
    return result;
  }, [member, transactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--sf-surface)' }}>
        <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid var(--sf-border)', borderTopColor: 'var(--sf-accent)' }} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: 'var(--sf-surface)' }}>
        <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>Member not found</div>
        <Button onPress={() => router.push('/')} className="text-white" style={{ background: 'var(--sf-accent)' }}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const atRiskChannels = getAtRiskChannels(member);
  const nextBestActions = getNextBestActions(member);
  const channelCount = [member.golf, member.retail, member.food].filter((c) => c.score > 0).length;
  const CHANNEL_LABEL_MAP: Record<ChannelName, string> = { golf: 'Golf', retail: 'Retail', food: 'Food & Beverage' };

  return (
    <div className="h-screen overflow-y-auto" style={{ background: 'var(--sf-surface)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 px-6 py-3 flex items-center gap-4" style={{ background: 'var(--sf-primary)' }}>
        <Button variant="ghost" size="sm" onPress={() => router.push('/')} className="text-white/70 hover:text-white">
          ← Back to Dashboard
        </Button>
        <div className="text-white text-sm font-bold">Member 360 Profile</div>
      </div>

      {/* Alert banner */}
      {member.flagged && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-6 py-3 flex items-center gap-3"
          style={{ background: '#FFF3E0', borderBottom: '2px solid var(--sf-warning)' }}
        >
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--sf-warning)' }}>At-Risk Alert</div>
            <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
              Declining engagement detected in {atRiskChannels.length ? atRiskChannels.map(c => CHANNEL_LABEL_MAP[c]).join(', ') : 'this member\'s profile'} — high spend but low recency
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <Card.Content className="p-5">
            <div className="flex items-start gap-5">
              <Avatar size="lg" className="flex-shrink-0" style={{ background: 'var(--sf-accent)' }}>
                <Avatar.Fallback className="bg-transparent text-white text-xl font-bold">
                  {getMemberInitials(member)}
                </Avatar.Fallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>
                    {member.name}
                  </h2>
                  <SegmentChip segment={member.general_segment} showIcon />
                  {member.flagged && (
                    <Chip size="sm" color="warning" variant="soft">Flagged</Chip>
                  )}
                </div>
                <div className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>{member.email}</div>
                <div className="flex gap-6 mt-3 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Phone</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{member.phone || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Date of Birth</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{member.dob || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Gender</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{getGenderLabel(member.gender)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Total Spend</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(member.total_spend)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Channels</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{channelCount} active</div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ChannelCard
            channel="golf" label="Golf" metrics={member.golf} segment={member.golf_segment}
            activity={activityByChannel?.golf ?? []}
            expanded={expandedChannel === 'golf'} onToggle={() => setExpandedChannel(expandedChannel === 'golf' ? null : 'golf')}
          />
          <ChannelCard
            channel="retail" label="Retail" metrics={member.retail} segment={member.retail_segment}
            activity={activityByChannel?.retail ?? []}
            expanded={expandedChannel === 'retail'} onToggle={() => setExpandedChannel(expandedChannel === 'retail' ? null : 'retail')}
          />
          <ChannelCard
            channel="food" label="Food & Beverage" metrics={member.food} segment={member.food_segment}
            activity={activityByChannel?.food ?? []}
            expanded={expandedChannel === 'food'} onToggle={() => setExpandedChannel(expandedChannel === 'food' ? null : 'food')}
          />
        </div>

        {/* AI Insight */}
        <Card className="mb-6">
          <Card.Content className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sf-accent)', color: 'white' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2z" />
                </svg>
              </div>
              <div className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>Agentforce Recommendations</div>
            </div>
            <div className="flex flex-col gap-2">
              {nextBestActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg flex-wrap"
                  style={{ background: 'var(--sf-surface)' }}
                >
                  <span className="text-sm flex-1 min-w-[200px]" style={{ color: 'var(--sf-text)' }}>{action}</span>
                  <Button
                    size="sm"
                    onPress={() => openChatWithContext(`Help me execute this recommended action for ${member.name}: "${action}". Draft the outreach.`)}
                    className="text-white flex-shrink-0"
                    style={{ background: 'var(--sf-accent)' }}
                  >
                    🤖 Ask Agentforce
                  </Button>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>

        {/* Segment Breakdown */}
        <Card>
          <Card.Content className="p-4">
            <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>D360 Segment Breakdown</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['Golf', member.golf_segment],
                ['Retail', member.retail_segment],
                ['Food & Beverage', member.food_segment],
                ['General', member.general_segment],
              ] as [string, string][]).map(([label, seg]) => (
                <div key={label} className="p-3 rounded-lg" style={{ background: 'var(--sf-surface)' }}>
                  <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>{label}</div>
                  <SegmentChip segment={seg} showIcon />
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
