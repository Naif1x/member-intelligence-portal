'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Chip } from '@heroui/react';
import type { Member, MemberData, ChannelName, ChannelMetrics } from '@/types';
import { CHANNEL_COLORS, getAtRiskChannels } from '@/types';
import { formatCurrency, getGenderLabel, getMemberInitials } from '@/lib/data';
import { generateAgentResponse } from '@/lib/agentforce';
import { motion, AnimatePresence } from 'framer-motion';
import SegmentChip from '@/components/ui/SegmentChip';

// Illustrative transaction rows for the expanded channel card — the D360 export
// contains channel aggregates only, not per-transaction line items.
function mockTransactions(channel: ChannelName, metrics: ChannelMetrics) {
  const items: Record<ChannelName, string[]> = {
    golf: ['18-Hole Round + Cart', 'Driving Range Bucket', '9-Hole Twilight Round', 'Pro Shop Green Fee', '18-Hole Round'],
    retail: ['Apparel Purchase', 'Golf Glove & Balls', 'Footwear', 'Accessories Bundle', 'Club Fitting Purchase'],
    food: ['Clubhouse Dinner', 'Halfway House Snack', 'Beverage Cart Order', 'Lounge Brunch', 'Grill Room Lunch'],
  };
  const avg = metrics.spend;
  return items[channel].map((label, i) => ({
    label,
    amount: Math.max(20, Math.round((avg / 5) * (0.6 + Math.random() * 0.8))),
    daysAgo: (i + 1) * Math.max(3, Math.round(30 / Math.max(metrics.r, 1))),
  }));
}

function ChannelCard({
  channel, label, metrics, segment, expanded, onToggle,
}: {
  channel: ChannelName; label: string; metrics: ChannelMetrics; segment: string;
  expanded: boolean; onToggle: () => void;
}) {
  const hasData = metrics.score > 0 || metrics.spend > 0;

  if (!hasData) return (
    <Card className="opacity-50">
      <Card.Content className="p-4">
        <div className="text-sm font-bold mb-2" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
        <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>No activity in this channel</div>
      </Card.Content>
    </Card>
  );

  const transactions = expanded ? mockTransactions(channel, metrics) : [];

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
                  Recent Activity (illustrative — D360 export contains aggregates only)
                </div>
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-xs" style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--sf-border)' : 'none' }}>
                    <span style={{ color: 'var(--sf-text)' }}>{tx.label}</span>
                    <span style={{ color: 'var(--sf-text-secondary)' }}>{tx.daysAgo}d ago</span>
                    <span className="font-medium" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
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
  const quickInsight = generateAgentResponse('recommend next best actions', member);
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
            expanded={expandedChannel === 'golf'} onToggle={() => setExpandedChannel(expandedChannel === 'golf' ? null : 'golf')}
          />
          <ChannelCard
            channel="retail" label="Retail" metrics={member.retail} segment={member.retail_segment}
            expanded={expandedChannel === 'retail'} onToggle={() => setExpandedChannel(expandedChannel === 'retail' ? null : 'retail')}
          />
          <ChannelCard
            channel="food" label="Food & Beverage" metrics={member.food} segment={member.food_segment}
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
            <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--sf-text)' }}>
              {quickInsight}
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
