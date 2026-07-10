'use client';

import { useApp } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/data';
import type { Member } from '@/types';

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

function getInsights(member: Member) {
  const insights = [];

  if (member.atRisk) {
    insights.push({
      title: `At-Risk: ${member.atRiskChannels.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}`,
      description: `${member.firstName} shows declining engagement in ${member.atRiskChannels.join(', ')} despite high spending. Re-engagement within 14 days recommended.`,
      action: 'Create Re-engagement Flow',
    });
  }

  if (member.channels.golf && !member.channels.retail) {
    insights.push({
      title: 'Cross-sell Opportunity',
      description: `${member.firstName} is active in Golf but hasn't visited Retail. Personalized offer for golf equipment could drive incremental revenue.`,
      action: 'Send Retail Offer',
    });
  }

  if (member.channels.retail && !member.channels.food) {
    insights.push({
      title: 'F&B Introduction',
      description: `${member.firstName} shops at Retail but hasn't dined with us. A complimentary appetizer voucher could expand engagement.`,
      action: 'Send Dining Voucher',
    });
  }

  if (!member.autoRenew && member.subscriptionStatus === 'Active') {
    insights.push({
      title: 'Auto-Renewal Risk',
      description: `Subscription expires ${member.subscriptionEnd || 'soon'} with auto-renew OFF. Proactive outreach recommended.`,
      action: 'Schedule Renewal Call',
    });
  }

  if (member.segment === 'Champions') {
    insights.push({
      title: 'VIP Recognition',
      description: `As a Champion with ${formatCurrency(member.general.totalMonetary)} lifetime value, ${member.firstName} qualifies for exclusive member events.`,
      action: 'Invite to VIP Event',
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Engagement Healthy',
      description: `${member.firstName}'s engagement metrics are stable. Continue current touchpoint cadence.`,
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
                {selectedMember.firstName} {selectedMember.lastName}
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
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{selectedMember.segment}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Lifetime Value</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(selectedMember.general.totalMonetary)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>General RFM</div>
                  <div className="rfm-score-cell">
                    {selectedMember.general.rfmScore.split('').map((d, i) => (
                      <span key={i} className={`rfm-digit rfm-${d}`}>{d}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Channels</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>
                    {[selectedMember.channels.golf && 'G', selectedMember.channels.retail && 'R', selectedMember.channels.food && 'F'].filter(Boolean).join(' · ')}
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
