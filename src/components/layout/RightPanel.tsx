'use client';

import { useApp } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/data';
import type { Member, ChannelName } from '@/types';
import { CHANNEL_LABELS } from '@/types';

function InsightCard({ title, description, action }: { title: string; description: string; action: string }) {
  return (
    <div className="slds-card p-3 mb-2">
      <div className="text-sm font-semibold mb-1" style={{ color: 'var(--sf-primary)' }}>{title}</div>
      <p className="text-xs mb-2" style={{ color: 'var(--sf-text-secondary)' }}>{description}</p>
      <button
        className="text-xs font-medium px-3 py-1.5 rounded"
        style={{ background: 'var(--sf-secondary)', color: 'white' }}
      >
        {action}
      </button>
    </div>
  );
}

function getAtRiskChannels(m: Member): ChannelName[] {
  const channels: ChannelName[] = [];
  if (m.golf_segment === 'Big Spender at Risk') channels.push('golf');
  if (m.retail_segment === 'Big Spender at Risk') channels.push('retail');
  if (m.food_segment === 'Big Spender at Risk') channels.push('food');
  return channels;
}

function getInsights(member: Member) {
  const insights = [];
  const firstName = member.name.split(/\s+/)[0];
  const atRiskChannels = getAtRiskChannels(member);

  if (member.flagged) {
    insights.push({
      title: `At-Risk: ${atRiskChannels.map((c) => CHANNEL_LABELS[c]).join(', ') || 'General'}`,
      description: `${firstName} shows declining engagement (low recency, high spend) in ${atRiskChannels.map((c) => CHANNEL_LABELS[c]).join(', ') || 'their overall profile'}. Re-engagement within 14 days recommended.`,
      action: 'Create Re-engagement Flow',
    });
  }

  if (member.golf.score > 0 && member.retail.score === 0) {
    insights.push({
      title: 'Cross-sell Opportunity',
      description: `${firstName} is active in Golf but hasn't visited Retail. Personalized offer for golf equipment could drive incremental revenue.`,
      action: 'Send Retail Offer',
    });
  }

  if (member.retail.score > 0 && member.food.score === 0) {
    insights.push({
      title: 'F&B Introduction',
      description: `${firstName} shops at Retail but hasn't dined with us. A complimentary appetizer voucher could expand engagement.`,
      action: 'Send Dining Voucher',
    });
  }

  if (member.general_segment === 'Champion') {
    insights.push({
      title: 'VIP Recognition',
      description: `As a Champion with ${formatCurrency(member.total_spend)} total spend, ${firstName} qualifies for exclusive member events.`,
      action: 'Invite to VIP Event',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Engagement Healthy',
      description: `${firstName}'s engagement metrics are stable. Continue current touchpoint cadence.`,
      action: 'View Full Profile',
    });
  }

  return insights;
}

export default function RightPanel() {
  const { rightPanelOpen, setRightPanelOpen, selectedMember } = useApp();

  return (
    <AnimatePresence>
      {rightPanelOpen && selectedMember && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full flex-shrink-0 border-l overflow-y-auto"
          style={{
            width: 400,
            borderColor: 'var(--sf-border)',
            background: 'var(--sf-surface)',
          }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--sf-border)', background: 'white' }}>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>
                Business Insights
              </div>
              <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
                {selectedMember.name}
              </div>
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-100 text-gray-500"
            >
              ✕
            </button>
          </div>

          {/* Member Quick Stats */}
          <div className="p-4">
            <div className="slds-card p-3 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Segment</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{selectedMember.general_segment}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Total Spend</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(selectedMember.total_spend)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>General RFM</div>
                  <div className="rfm-score-cell">
                    {String(selectedMember.general.score).padStart(3, '0').split('').map((d, i) => (
                      <span key={i} className={`rfm-digit rfm-${d}`}>{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Channels</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>
                    {[selectedMember.golf.score > 0 && 'G', selectedMember.retail.score > 0 && 'R', selectedMember.food.score > 0 && 'F'].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-secondary)' }}>
              AI-Generated Insights
            </div>
            {getInsights(selectedMember).map((insight, i) => (
              <InsightCard key={i} {...insight} />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
