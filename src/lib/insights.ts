import type { MemberData, ChannelName } from '@/types';
import { computeSummary, CHANNEL_LABELS } from '@/types';
import type { TransactionData } from '@/types/transactions';
import { computeAtRiskWithRecency, computeCrossSellTargets, computeGolfAttachRate } from './transactions';
import { formatCurrency } from './data';

export type InsightIcon =
  | 'trophy' | 'trending-down' | 'alert-triangle' | 'lightbulb'
  | 'bar-chart' | 'shield' | 'siren' | 'target' | 'flag';

export interface BusinessInsight {
  id: string;
  icon: InsightIcon;
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
      icon: 'trophy',
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
      icon: 'trending-down',
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
      icon: 'alert-triangle',
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
        icon: 'lightbulb',
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
        icon: 'bar-chart',
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
      icon: 'shield',
      tone: 'opportunity',
      stat: `${pct}%`,
      text: `of total revenue (${formatCurrency(top10Spend)}) comes from just your top ${top10.length} members. Protect this concentrated value with proactive VIP retention.`,
      actionLabel: 'Draft VIP Retention Plan',
      actionPrompt: `Draft a VIP retention plan for our top ${top10.length} members by spend, who together represent ${pct}% of total revenue (${formatCurrency(top10Spend)}).`,
    });
  }

  return insights;
}

// Transaction-derived insights — need real visit/purchase history on top of
// the datagraph's RFM segments, so these are computed separately and merged
// alongside computeBusinessInsights() in the panel.
export function computeTransactionInsights(data: MemberData, transactions: TransactionData): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const asOfDate = transactions.dateRange.max;

  // 1. Big Spender at Risk — named, with real recency
  const atRisk = computeAtRiskWithRecency(data.members, transactions.headers, asOfDate);
  if (atRisk.length > 0) {
    const totalAtRiskSpend = atRisk.reduce((s, m) => s + m.totalSpend, 0);
    const named = atRisk
      .slice(0, 5)
      .map((m) => `${m.name} (${formatCurrency(m.totalSpend)}, ${m.daysSinceLastVisit ?? '—'}d since last visit)`)
      .join('; ');
    const more = atRisk.length > 5 ? ` +${atRisk.length - 5} more` : '';
    insights.push({
      id: 'at-risk-recency',
      icon: 'siren',
      tone: 'risk',
      stat: `${atRisk.length}`,
      text: `Big Spender at Risk members, worth ${formatCurrency(totalAtRiskSpend)} combined, verified against real visit history: ${named}${more}. Immediate win-back outreach recommended.`,
      actionLabel: 'Launch Win-Back Campaign',
      actionPrompt: `Draft a win-back campaign for our top at-risk members by spend: ${atRisk.slice(0, 5).map((m) => `${m.name} (${formatCurrency(m.totalSpend)}, ${m.daysSinceLastVisit ?? 'unknown'} days since last visit)`).join('; ')}. Total exposure: ${formatCurrency(totalAtRiskSpend)}.`,
    });
  }

  // 2. Channel cross-sell targets — proven in one channel, absent in another
  const crossSell = computeCrossSellTargets(data.members, 8);
  if (crossSell.length > 0) {
    const top = crossSell.slice(0, 5);
    const named = top
      .map((t) => `${t.name} (${formatCurrency(t.strongSpend)} ${CHANNEL_LABELS[t.strongChannel]}, zero ${t.missingChannels.map((c) => CHANNEL_LABELS[c]).join('/')})`)
      .join('; ');
    insights.push({
      id: 'cross-sell-targets',
      icon: 'target',
      tone: 'opportunity',
      stat: `${crossSell.length}`,
      text: `members are strong in one channel with zero footprint in another — a ready-made cross-sell target list: ${named}. Prioritize by spend to close the gap fastest.`,
      actionLabel: 'Draft Cross-Sell Outreach',
      actionPrompt: `Draft a cross-sell outreach plan for these members, each strong in one channel but inactive in another: ${top.map((t) => `${t.name} — ${CHANNEL_LABELS[t.strongChannel]} spend ${formatCurrency(t.strongSpend)}, no ${t.missingChannels.map((c) => CHANNEL_LABELS[c]).join('/')} activity`).join('; ')}.`,
    });
  }

  // 3. Golf attach rate — proves the cross-channel story with real baskets
  const attach = computeGolfAttachRate(transactions.headers);
  if (attach.totalGolfVisits > 0) {
    insights.push({
      id: 'golf-attach-rate',
      icon: 'flag',
      tone: 'info',
      stat: `${attach.attachRate}%`,
      text: `of golf visits (${attach.attachedVisits} of ${attach.totalGolfVisits}) also included Retail or F&B spend within a day — golfers already cross-shop. Promote a bundled "stay and shop" offer at check-in to convert the rest.`,
      actionLabel: 'Draft Bundle Promotion',
      actionPrompt: `Draft a "stay and shop" bundle promotion for golfers. Currently ${attach.attachRate}% of golf visits (${attach.attachedVisits} of ${attach.totalGolfVisits}) also include Retail or F&B spend within a day — the goal is converting more of the remaining ${attach.totalGolfVisits - attach.attachedVisits} golf-only visits.`,
    });
  }

  return insights;
}
