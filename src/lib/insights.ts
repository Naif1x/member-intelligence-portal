import type { MemberData, ChannelName } from '@/types';
import { computeSummary, CHANNEL_LABELS } from '@/types';
import { formatCurrency } from './data';

export interface BusinessInsight {
  id: string;
  icon: string;
  tone: 'opportunity' | 'risk' | 'info';
  stat: string;
  text: string;
  actionLabel: string;
  actionPrompt: string;
}

// Rule-based, computed directly from the current dataset — every number in
// every insight traces back to computeSummary()/raw member fields, nothing
// is hardcoded or illustrative.
export function computeBusinessInsights(data: MemberData): BusinessInsight[] {
  const { members } = data;
  const summary = computeSummary(members);
  const insights: BusinessInsight[] = [];
  const total = summary.totalMembers;
  const totalSales = summary.totalSales;

  // 1. Champion revenue concentration
  const championMembers = members.filter((m) => m.general_segment === 'Champion');
  const championSpend = championMembers.reduce((s, m) => s + m.total_spend, 0);
  if (totalSales > 0 && championMembers.length > 0) {
    const pct = Math.round((championSpend / totalSales) * 100);
    insights.push({
      id: 'champion-concentration',
      icon: '🏆',
      tone: 'opportunity',
      stat: `${pct}%`,
      text: `of total revenue comes from your ${championMembers.length} Champion members. Recognize them with a personalized appreciation campaign to protect this core revenue.`,
      actionLabel: 'Send Appreciation Campaign',
      actionPrompt: `Draft a personalized appreciation campaign for our ${championMembers.length} Champion members, who together generate ${pct}% of total revenue (${formatCurrency(championSpend)}).`,
    });
  }

  // 2. Lost / Almost Lost churn exposure
  const lostMembers = members.filter((m) => m.general_segment === 'Lost' || m.general_segment === 'Almost Lost');
  if (lostMembers.length > 0) {
    const pct = Math.round((lostMembers.length / total) * 100);
    insights.push({
      id: 'churn-risk',
      icon: '📉',
      tone: 'risk',
      stat: `${pct}%`,
      text: `of members are Lost or Almost Lost. Retarget them with a free-offer reactivation campaign before they're gone for good.`,
      actionLabel: 'Launch Win-Back Campaign',
      actionPrompt: `Design a reactivation campaign targeting our ${lostMembers.length} Lost/Almost Lost members (${pct}% of the base).`,
    });
  }

  // 3. At-risk high-value members
  const flagged = members.filter((m) => m.flagged);
  if (flagged.length > 0) {
    const flaggedSpend = flagged.reduce((s, m) => s + m.total_spend, 0);
    const pct = Math.round((flagged.length / total) * 100);
    insights.push({
      id: 'at-risk-value',
      icon: '⚠️',
      tone: 'risk',
      stat: `${pct}%`,
      text: `of members (${flagged.length}, worth ${formatCurrency(flaggedSpend)}) are flagged Big Spender at Risk — high value, declining engagement. A timely win-back offer could recover a meaningful share before churn.`,
      actionLabel: 'Launch Win-Back Agent',
      actionPrompt: `Generate a win-back strategy for our ${flagged.length} Big Spender at Risk members, representing ${formatCurrency(flaggedSpend)} in historical spend.`,
    });
  }

  // 4. Channel concentration / cross-sell opportunity
  const channelEntries = (['golf', 'retail', 'food'] as ChannelName[]).map((ch) => [ch, summary.channelSpend[ch]] as const);
  const sortedChannels = [...channelEntries].sort((a, b) => b[1] - a[1]);
  const [topCh, topSpend] = sortedChannels[0];
  const [lowCh, lowSpend] = sortedChannels[sortedChannels.length - 1];
  if (totalSales > 0 && topSpend > 0) {
    const topPct = Math.round((topSpend / totalSales) * 100);
    const lowPct = Math.round((lowSpend / totalSales) * 100);
    if (topPct - lowPct >= 20) {
      insights.push({
        id: 'channel-concentration',
        icon: '💡',
        tone: 'opportunity',
        stat: `${topPct}%`,
        text: `of revenue comes from ${CHANNEL_LABELS[topCh]}, while ${CHANNEL_LABELS[lowCh]} trails at just ${lowPct}%. Promote cross-channel bundles to grow the underperforming channel.`,
        actionLabel: 'Promote Cross-Sell Offer',
        actionPrompt: `Suggest a cross-sell campaign to grow ${CHANNEL_LABELS[lowCh]} engagement, which currently trails ${CHANNEL_LABELS[topCh]} at only ${lowPct}% of revenue vs ${topPct}%.`,
      });
    }
  }

  // 5. Identity resolution gap
  const noDataMembers = members.filter((m) => m.general_segment === 'No Data');
  if (noDataMembers.length > 0) {
    const pct = Math.round((noDataMembers.length / total) * 100);
    if (pct >= 5) {
      insights.push({
        id: 'identity-gap',
        icon: '📊',
        tone: 'info',
        stat: `${pct}%`,
        text: `of profiles show a "No Data" segment. Improving identity resolution for these members would unlock personalization and campaign targeting.`,
        actionLabel: 'Review Identity Resolution',
        actionPrompt: `We have ${noDataMembers.length} member profiles (${pct}%) with insufficient signal for segmentation. Suggest concrete steps to improve identity resolution coverage.`,
      });
    }
  }

  // 6. Revenue concentration in top spenders
  const top10 = summary.topMembersBySpend;
  const top10Spend = top10.reduce((s, m) => s + m.total_spend, 0);
  if (totalSales > 0 && top10.length > 0) {
    const pct = Math.round((top10Spend / totalSales) * 100);
    insights.push({
      id: 'top-concentration',
      icon: '🛡️',
      tone: 'opportunity',
      stat: `${pct}%`,
      text: `of total revenue (${formatCurrency(top10Spend)}) comes from just your top ${top10.length} members. Protect this concentrated value with proactive VIP retention.`,
      actionLabel: 'Draft VIP Retention Plan',
      actionPrompt: `Draft a VIP retention plan for our top ${top10.length} members by spend, who together represent ${pct}% of total revenue (${formatCurrency(top10Spend)}).`,
    });
  }

  return insights;
}
