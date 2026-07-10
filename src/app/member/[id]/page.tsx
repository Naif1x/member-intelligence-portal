'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member, MemberData, ChannelName, ChannelMetrics } from '@/types';
import { SEGMENT_COLORS, CHANNEL_COLORS, CHANNEL_LABELS } from '@/types';
import { formatCurrency, getGenderLabel, getMemberInitials, getSegmentIcon } from '@/lib/data';
import { generateAgentResponse } from '@/lib/agentforce';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

function RFMBadge({ score }: { score: number }) {
  return (
    <span className="rfm-score-cell">
      {String(score).padStart(3, '0').split('').map((d, i) => (
        <span key={i} className={`rfm-digit rfm-${d}`}>{d}</span>
      ))}
    </span>
  );
}

function ChannelCard({ channel, label, metrics, segment }: { channel: ChannelName; label: string; metrics: ChannelMetrics; segment: string }) {
  if (metrics.score === 0 && metrics.spend === 0) return (
    <div className="slds-card p-4 opacity-50">
      <div className="text-sm font-bold mb-2" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
      <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>No activity in this channel</div>
    </div>
  );

  return (
    <div className="slds-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
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
          style={{ background: `${SEGMENT_COLORS[segment]}15`, color: SEGMENT_COLORS[segment] }}
        >
          {segment}
        </span>
      </div>
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" style={{ background: 'var(--sf-surface)' }}>
        <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>Member not found</div>
        <button onClick={() => router.push('/')} className="text-sm px-4 py-2 rounded text-white" style={{ background: 'var(--sf-secondary)' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const atRiskChannels: ChannelName[] = [];
  if (member.golf_segment === 'Big Spender at Risk') atRiskChannels.push('golf');
  if (member.retail_segment === 'Big Spender at Risk') atRiskChannels.push('retail');
  if (member.food_segment === 'Big Spender at Risk') atRiskChannels.push('food');

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
          ← Dashboard
        </button>
        <div className="text-white text-sm font-bold">Member 360 Profile</div>
      </div>

      {/* Alert banner */}
      {member.flagged && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-6 py-3 flex items-center gap-3"
          style={{ background: '#FEF2F2', borderBottom: '2px solid var(--sf-error)' }}
        >
          <span className="text-lg">⚠️</span>
          <div>
            <div className="text-sm font-bold" style={{ color: 'var(--sf-error)' }}>At-Risk Alert</div>
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
              style={{ background: 'var(--sf-secondary)' }}
            >
              {getMemberInitials(member)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>
                  {member.name}
                </h2>
                <span
                  className="slds-badge"
                  style={{ background: `${SEGMENT_COLORS[member.general_segment]}15`, color: SEGMENT_COLORS[member.general_segment] }}
                >
                  {getSegmentIcon(member.general_segment)} {member.general_segment}
                </span>
                {member.flagged && (
                  <span className="slds-badge" style={{ background: '#FEE2E2', color: 'var(--sf-error)' }}>Flagged</span>
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <ChannelCard channel="golf" label="Golf" metrics={member.golf} segment={member.golf_segment} />
          <ChannelCard channel="retail" label="Retail" metrics={member.retail} segment={member.retail_segment} />
          <ChannelCard channel="food" label="Food & Beverage" metrics={member.food} segment={member.food_segment} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Radar Chart */}
          <div className="slds-card p-4">
            <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>Cross-Channel RFM Profile</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e5e5" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#5A5A5A' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 4]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="value" stroke="#0176D3" fill="#0176D3" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insight */}
          <div className="slds-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--sf-secondary)', color: 'white' }}>
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
          <div className="grid grid-cols-4 gap-3">
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
                  style={{ background: `${SEGMENT_COLORS[seg]}15`, color: SEGMENT_COLORS[seg] }}
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
