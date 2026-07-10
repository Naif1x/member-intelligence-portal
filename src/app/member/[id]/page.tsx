'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Member, MemberData, ChannelName } from '@/types';
import { SEGMENT_COLORS, CHANNEL_COLORS, CHANNEL_LABELS } from '@/types';
import { formatCurrency, getMemberName, getSegmentIcon } from '@/lib/data';
import { generateAgentResponse } from '@/lib/agentforce';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

function RFMBadge({ score }: { score: string }) {
  return (
    <span className="rfm-score-cell">
      {score.split('').map((d, i) => (
        <span key={i} className={`rfm-digit rfm-${d}`}>{d}</span>
      ))}
    </span>
  );
}

function ChannelCard({ channel, label, metrics }: { channel: ChannelName; label: string; metrics: Member['channels']['golf'] }) {
  if (!metrics) return (
    <div className="slds-card p-4 opacity-50">
      <div className="text-sm font-bold mb-2" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
      <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>No activity in this channel</div>
    </div>
  );

  return (
    <div className="slds-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold" style={{ color: CHANNEL_COLORS[channel] }}>{label}</div>
        <RFMBadge score={metrics.rfmScore} />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Recency</div>
          <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>R{metrics.r}</div>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-secondary)' }}>{metrics.recencyDays}d ago</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Frequency</div>
          <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>F{metrics.f}</div>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-secondary)' }}>{metrics.frequency} visits</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Monetary</div>
          <div className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>M{metrics.m}</div>
          <div className="text-[10px]" style={{ color: 'var(--sf-text-secondary)' }}>{formatCurrency(metrics.monetary)}</div>
        </div>
      </div>
      <div className="text-[10px]" style={{ color: 'var(--sf-text-secondary)' }}>
        Last activity: {metrics.lastActivity}
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
    fetch('/data/members.json')
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

  const radarData = [
    { metric: 'Golf R', value: member.channels.golf?.r || 0, fullMark: 4 },
    { metric: 'Golf F', value: member.channels.golf?.f || 0, fullMark: 4 },
    { metric: 'Golf M', value: member.channels.golf?.m || 0, fullMark: 4 },
    { metric: 'Retail R', value: member.channels.retail?.r || 0, fullMark: 4 },
    { metric: 'Retail F', value: member.channels.retail?.f || 0, fullMark: 4 },
    { metric: 'Retail M', value: member.channels.retail?.m || 0, fullMark: 4 },
    { metric: 'F&B R', value: member.channels.food?.r || 0, fullMark: 4 },
    { metric: 'F&B F', value: member.channels.food?.f || 0, fullMark: 4 },
    { metric: 'F&B M', value: member.channels.food?.m || 0, fullMark: 4 },
  ];

  const quickInsight = generateAgentResponse('recommend next best actions', member);

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
      {member.atRisk && (
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
              Declining engagement detected in {member.atRiskChannels.map(c => CHANNEL_LABELS[c]).join(', ')} — high spend but low recency (R≤2, M≥3)
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
              {member.firstName?.[0]}{member.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg font-bold" style={{ color: 'var(--sf-primary)' }}>
                  {getMemberName(member)}
                </h2>
                <span
                  className="slds-badge"
                  style={{ background: `${SEGMENT_COLORS[member.segment]}15`, color: SEGMENT_COLORS[member.segment] }}
                >
                  {getSegmentIcon(member.segment)} {member.segment}
                </span>
                {member.atRisk && (
                  <span className="slds-badge" style={{ background: '#FEE2E2', color: 'var(--sf-error)' }}>At Risk</span>
                )}
              </div>
              <div className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>{member.email}</div>
              <div className="flex gap-6 mt-3 flex-wrap">
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Member No</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{member.membershipNo || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Subscription</div>
                  <div className="text-sm font-semibold" style={{ color: member.subscriptionStatus === 'Active' ? 'var(--sf-success)' : 'var(--sf-text-secondary)' }}>
                    {member.subscriptionStatus}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>General RFM</div>
                  <RFMBadge score={member.general.rfmScore} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Lifetime Value</div>
                  <div className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(member.general.totalMonetary)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Systems</div>
                  <div className="flex gap-1 mt-0.5">
                    {member.systems.map(s => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#EBF5FF', color: 'var(--sf-secondary)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <ChannelCard channel="golf" label="Golf" metrics={member.channels.golf} />
          <ChannelCard channel="retail" label="Retail" metrics={member.channels.retail} />
          <ChannelCard channel="food" label="Food & Beverage" metrics={member.channels.food} />
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

        {/* Activity Timeline */}
        <div className="slds-card p-4">
          <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>Recent Activity</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {(() => {
              const allTx: { date: string; channel: string; desc: string; amount: number }[] = [];
              if (member.channels.golf) {
                member.channels.golf.transactions.forEach(t => {
                  allTx.push({ date: t.date, channel: 'Golf', desc: `Golf Round`, amount: t.amount });
                });
              }
              if (member.channels.retail) {
                member.channels.retail.transactions.forEach(t => {
                  allTx.push({ date: t.date, channel: 'Retail', desc: `Retail Purchase`, amount: t.amount });
                });
              }
              if (member.channels.food) {
                member.channels.food.transactions.forEach(t => {
                  allTx.push({ date: t.date, channel: 'F&B', desc: (t as Record<string, unknown>).item as string || 'F&B Order', amount: t.amount });
                });
              }
              allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              return allTx.slice(0, 15).map((tx, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded hover:bg-gray-50" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: tx.channel === 'Golf' ? CHANNEL_COLORS.golf : tx.channel === 'Retail' ? CHANNEL_COLORS.retail : CHANNEL_COLORS.food
                  }} />
                  <div className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--sf-text-secondary)' }}>{tx.date}</div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{
                    background: tx.channel === 'Golf' ? '#DCFCE7' : tx.channel === 'Retail' ? '#DBEAFE' : '#FEF3C7',
                    color: tx.channel === 'Golf' ? CHANNEL_COLORS.golf : tx.channel === 'Retail' ? CHANNEL_COLORS.retail : CHANNEL_COLORS.food,
                  }}>{tx.channel}</span>
                  <div className="text-sm flex-1 truncate" style={{ color: 'var(--sf-text)' }}>{tx.desc}</div>
                  <div className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--sf-primary)' }}>
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
