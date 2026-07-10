'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member, MemberData, ChannelName, ChannelMetrics } from '@/types';
import { SEGMENT_COLORS, CHANNEL_COLORS, CHANNEL_LABELS, getAtRiskChannels } from '@/types';
import { formatCurrency, getGenderLabel, getMemberInitials, getSegmentIcon } from '@/lib/data';
import { generateAgentResponse } from '@/lib/agentforce';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const RFM_TOOLTIPS: Record<'R' | 'F' | 'M', string> = {
  R: 'Recency: how recently this member engaged with the channel. 4 = very recent, 1 = long ago.',
  F: 'Frequency: how often this member visits the channel. 4 = highest quartile, 1 = lowest.',
  M: 'Monetary: how much this member spends in the channel. 4 = highest quartile, 1 = lowest.',
};

function RFMBadge({ score }: { score: number }) {
  const labels: ('R' | 'F' | 'M')[] = ['R', 'F', 'M'];
  return (
    <span className="rfm-score-cell">
      {String(score).padStart(3, '0').split('').map((d, i) => (
        <span key={i} className={`rfm-digit rfm-${d}`} title={RFM_TOOLTIPS[labels[i]]}>{d}</span>
      ))}
    </span>
  );
}

// Illustrative transaction rows for the expanded channel card — the D360 export
// contains RFM scores only, not per-transaction line items.
function mockTransactions(channel: ChannelName, metrics: ChannelMetrics) {
  const items: Record<ChannelName, string[]> = {
    golf: ['18-Hole Round + Cart', 'Driving Range Bucket', '9-Hole Twilight Round', 'Pro Shop Green Fee', '18-Hole Round'],
    retail: ['Apparel Purchase', 'Golf Glove & Balls', 'Footwear', 'Accessories Bundle', 'Club Fitting Purchase'],
    food: ['Clubhouse Dinner', 'Halfway House Snack', 'Beverage Cart Order', 'Lounge Brunch', 'Grill Room Lunch'],
  };
  const avg = metrics.frequency_hint;
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
    <div className="slds-card p-4 opacity-50">
      <div className="text-sm font-bold mb-2" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
      <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>No activity in this channel</div>
    </div>
  );

  const transactions = expanded ? mockTransactions(channel, { ...metrics, frequency_hint: metrics.spend / Math.max(metrics.f, 1) } as ChannelMetrics & { frequency_hint: number }) : [];

  return (
    <div className="slds-card p-4">
      <button className="w-full text-left cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: CHANNEL_COLORS[channel] }}>
            {label}
            <span className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>{expanded ? '▲' : '▼'}</span>
          </div>
          <RFMBadge score={metrics.score} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Recency</div>
            <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>R{metrics.r}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Frequency</div>
            <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>F{metrics.f}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Monetary</div>
            <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>M{metrics.m}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(metrics.spend)}</div>
          <span
            className="slds-badge"
            style={{ background: `${SEGMENT_COLORS[segment]}18`, color: SEGMENT_COLORS[segment] }}
          >
            {segment}
          </span>
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
                Recent Activity (illustrative — D360 export contains scores only)
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
    </div>
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
        <button onClick={() => router.push('/')} className="text-sm px-4 py-2 rounded text-white" style={{ background: 'var(--sf-accent)' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const atRiskChannels = getAtRiskChannels(member);

  const radarData = [
    { metric: 'Golf R', value: member.golf.r, fullMark: 4 },
    { metric: 'Golf F', value: member.golf.f, fullMark: 4 },
    { metric: 'Golf M', value: member.golf.m, fullMark: 4 },
    { metric: 'Retail R', value: member.retail.r, fullMark: 4 },
    { metric: 'Retail F', value: member.retail.f, fullMark: 4 },
    { metric: 'Retail M', value: member.retail.m, fullMark: 4 },
    { metric: 'F&B R', value: member.food.r, fullMark: 4 },
    { metric: 'F&B F', value: member.food.f, fullMark: 4 },
    { metric: 'F&B M', value: member.food.m, fullMark: 4 },
  ];

  const quickInsight = generateAgentResponse('recommend next best actions', member);
  const channelCount = [member.golf, member.retail, member.food].filter((c) => c.score > 0).length;

  return (
    <div className="h-screen overflow-y-auto" style={{ background: 'var(--sf-surface)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 px-6 py-3 flex items-center gap-4" style={{ background: 'var(--sf-primary)' }}>
        <button onClick={() => router.push('/')} className="text-white/70 hover:text-white text-sm flex items-center gap-1">
          ← Back to Dashboard
        </button>
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
              Declining engagement detected in {atRiskChannels.length ? atRiskChannels.map(c => CHANNEL_LABELS[c]).join(', ') : 'this member\'s profile'} — high spend but low recency
            </div>
          </div>
        </motion.div>
      )}

      <div className="p-6">
        {/* Profile Header */}
        <div className="slds-card p-5 mb-6">
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: 'var(--sf-accent)' }}
            >
              {getMemberInitials(member)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h2 className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>
                  {member.name}
                </h2>
                <span
                  className="slds-badge"
                  style={{ background: `${SEGMENT_COLORS[member.general_segment]}18`, color: SEGMENT_COLORS[member.general_segment] }}
                >
                  {getSegmentIcon(member.general_segment)} {member.general_segment}
                </span>
                {member.flagged && (
                  <span className="slds-badge" style={{ background: '#FFF3E0', color: 'var(--sf-warning)' }}>Flagged</span>
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
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>General RFM</div>
                  <RFMBadge score={member.general.score} />
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
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Radar Chart */}
          <div className="slds-card p-4">
            <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>Cross-Channel RFM Profile</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e5e5" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="value" stroke="#00BCD4" fill="#00BCD4" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insight */}
          <div className="slds-card p-4">
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
          </div>
        </div>

        {/* Segment Breakdown */}
        <div className="slds-card p-4">
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
                <span
                  className="slds-badge"
                  style={{ background: `${SEGMENT_COLORS[seg]}18`, color: SEGMENT_COLORS[seg] }}
                >
                  {getSegmentIcon(seg)} {seg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
