'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, Chip } from '@heroui/react';
import { AlertTriangle, Lightbulb, BarChart3, Trophy, CheckCircle2, X, ArrowRight, type LucideIcon } from 'lucide-react';
import { useApp } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/data';
import type { Member, ChannelName } from '@/types';
import { CHANNEL_LABELS, CHANNEL_SEGMENT_FIELD, getAtRiskChannels } from '@/types';
import SegmentChip from '@/components/ui/SegmentChip';

type InsightIconKey = 'alert-triangle' | 'lightbulb' | 'bar-chart' | 'trophy' | 'check';

const INSIGHT_ICONS: Record<InsightIconKey, LucideIcon> = {
  'alert-triangle': AlertTriangle,
  lightbulb: Lightbulb,
  'bar-chart': BarChart3,
  trophy: Trophy,
  check: CheckCircle2,
};

interface Insight {
  icon: InsightIconKey;
  text: string;
  actionLabel: string;
  actionPrompt: string;
}

function InsightCard({ insight, onAction }: { insight: Insight; onAction: (prompt: string) => void }) {
  const Icon = INSIGHT_ICONS[insight.icon];
  return (
    <Card className="mb-2">
      <Card.Content className="p-3">
        <div className="flex gap-2 mb-2">
          <Icon size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--sf-accent-dark)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sf-text)' }}>{insight.text}</p>
        </div>
        <Button
          size="sm"
          onPress={() => onAction(insight.actionPrompt)}
          className="text-white"
          style={{ background: 'var(--sf-accent)' }}
        >
          {insight.actionLabel}
        </Button>
      </Card.Content>
    </Card>
  );
}

function buildInsights(member: Member): Insight[] {
  const insights: Insight[] = [];
  const name = member.name;
  const firstName = name.split(/\s+/)[0];
  const atRiskChannels = getAtRiskChannels(member);

  // 1. At-risk channel vs. healthy channels
  if (member.flagged && atRiskChannels.length > 0) {
    const strong: string[] = [];
    (['golf', 'retail', 'food'] as ChannelName[]).forEach((ch) => {
      if (member[ch].score > 0 && !atRiskChannels.includes(ch)) {
        strong.push(CHANNEL_LABELS[ch]);
      }
    });
    const riskLabel = atRiskChannels.map((c) => CHANNEL_LABELS[c]).join(', ');
    insights.push({
      icon: 'alert-triangle',
      text: `${firstName} shows declining recency in ${riskLabel} but remains active in ${strong.join(' and ') || 'other channels'}. High churn risk in this channel specifically.`,
      actionLabel: 'Launch Win-Back Agent',
      actionPrompt: `Generate a win-back strategy for ${name}, who is at risk in ${riskLabel}.`,
    });
  }

  // 2. Spend concentration / cross-sell
  const channelSpends: [ChannelName, number][] = [['golf', member.golf.spend], ['retail', member.retail.spend], ['food', member.food.spend]];
  const activeSpends = channelSpends.filter(([, spend]) => spend > 0);
  if (activeSpends.length >= 1 && member.total_spend > 0) {
    const top = activeSpends.reduce((a, b) => (b[1] > a[1] ? b : a));
    const pct = Math.round((top[1] / member.total_spend) * 100);
    const missingChannels = (['golf', 'retail', 'food'] as ChannelName[]).filter((ch) => member[ch].score === 0);
    if (pct >= 50 || missingChannels.length > 0) {
      insights.push({
        icon: 'lightbulb',
        text: `${pct}% of spend concentrated in ${CHANNEL_LABELS[top[0]]}.${missingChannels.length > 0 ? ` No activity yet in ${missingChannels.map((c) => CHANNEL_LABELS[c]).join(', ')} — cross-sell opportunity.` : ' Consider diversifying engagement across channels.'}`,
        actionLabel: 'Promote Cross-Sell Offer',
        actionPrompt: `Suggest a cross-sell offer for ${name}, whose spend is concentrated in ${CHANNEL_LABELS[top[0]]}.`,
      });
    }
  }

  // 3. Healthy general segment masking a weak channel
  const scored = channelSpends.map(([ch]) => ({ ch, score: member[ch].score })).filter((c) => c.score > 0);
  if (scored.length >= 2) {
    const lowest = scored.reduce((a, b) => (b.score < a.score ? b : a));
    if (member.general.score - lowest.score >= 100) {
      const lowestSegment = member[CHANNEL_SEGMENT_FIELD[lowest.ch]];
      insights.push({
        icon: 'bar-chart',
        text: `The overall "${member.general_segment}" standing masks a weaker ${CHANNEL_LABELS[lowest.ch]} position ("${lowestSegment}"). Blended views can hide channel-specific decline.`,
        actionLabel: 'Deep Analysis',
        actionPrompt: `Do a deep analysis for ${name} — their overall segment looks healthy but ${CHANNEL_LABELS[lowest.ch]} shows "${lowestSegment}".`,
      });
    }
  }

  // 4. Champion recognition
  if (member.general_segment === 'Champion') {
    insights.push({
      icon: 'trophy',
      text: `${firstName} is a Champion with ${formatCurrency(member.total_spend)} total spend. Protect this relationship with recognition, not discounting.`,
      actionLabel: 'Draft VIP Recognition',
      actionPrompt: `Draft a VIP recognition message for ${name}, a Champion-segment member with ${formatCurrency(member.total_spend)} total spend.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: 'check',
      text: `${firstName}'s engagement is stable across active channels. Continue current touchpoint cadence.`,
      actionLabel: 'View Full Profile',
      actionPrompt: `Summarize ${name}'s current engagement across all channels.`,
    });
  }

  return insights;
}

export default function RightPanel() {
  const { rightPanelOpen, setRightPanelOpen, selectedMember, openChatWithContext, persistStateForNavigation } = useApp();
  const router = useRouter();

  return (
    <AnimatePresence>
      {rightPanelOpen && selectedMember && (
        <motion.aside
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="h-full flex-shrink-0 border-l overflow-y-auto hidden lg:flex lg:flex-col"
          style={{
            width: 380,
            borderColor: 'var(--sf-border)',
            background: 'var(--sf-surface)',
          }}
        >
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--sf-border)', background: 'white' }}>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--sf-primary)' }}>
                Business Insights
              </div>
              <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
                {selectedMember.name}
              </div>
            </div>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label="Close insights panel"
              onPress={() => setRightPanelOpen(false)}
              className="text-gray-500"
            >
              <X size={16} strokeWidth={2} />
            </Button>
          </div>

          {/* Member Quick Stats */}
          <div className="p-4 overflow-y-auto">
            <Card className="mb-3">
              <Card.Content className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>Segment</div>
                    <SegmentChip segment={selectedMember.general_segment} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Total Spend</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>{formatCurrency(selectedMember.total_spend)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sf-text-secondary)' }}>Status</div>
                    {selectedMember.flagged ? (
                      <Chip size="sm" color="warning" variant="soft">Flagged</Chip>
                    ) : (
                      <Chip size="sm" color="success" variant="soft">Healthy</Chip>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sf-text-secondary)' }}>Channels</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--sf-primary)' }}>
                      {[selectedMember.golf.score > 0 && 'Golf', selectedMember.retail.score > 0 && 'Retail', selectedMember.food.score > 0 && 'F&B'].filter(Boolean).join(' · ') || 'None'}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  className="mt-3 gap-1.5"
                  onPress={() => {
                    persistStateForNavigation();
                    router.push(`/member/${selectedMember.id}`);
                  }}
                >
                  Open Member 360
                  <ArrowRight size={14} strokeWidth={2} />
                </Button>
              </Card.Content>
            </Card>

            {/* AI Insights */}
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--sf-text-secondary)' }}>
              AI-Generated Insights
            </div>
            {buildInsights(selectedMember).map((insight, i) => (
              <InsightCard key={i} insight={insight} onAction={openChatWithContext} />
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
