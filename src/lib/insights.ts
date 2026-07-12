import type { MemberData } from '@/types';
import { computeSummary, CHANNEL_LABELS } from '@/types';
import type { TransactionData } from '@/types/transactions';
import {
  computeAtRiskWithRecency, computeCrossSellTargets, computeGolfAttachRate,
  computeGolfDayBasket, computeRepeatItemLoyalty, computeRecencyCliff,
} from './transactions';
import { formatCurrency } from './data';

export type InsightIcon =
  | 'trophy' | 'trending-down' | 'alert-triangle' | 'lightbulb'
  | 'bar-chart' | 'shield' | 'siren' | 'target' | 'flag'
  | 'repeat' | 'shopping-basket' | 'clock';

export interface BusinessInsight {
  id: string;
  icon: InsightIcon;
  tone: 'opportunity' | 'risk' | 'info';
  stat: string;
  text: string;
  actionLabel: string;
  actionPrompt: string;
}

// Portfolio-level context insights. Everything traces to raw member fields —
// nothing hardcoded or illustrative.
export function computeBusinessInsights(data: MemberData): BusinessInsight[] {
  const { members } = data;
  const summary = computeSummary(members);
  const insights: BusinessInsight[] = [];
  const totalSales = summary.totalSales;

  // Champion revenue concentration
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

  // Revenue concentration in top spenders
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

// Transaction-mined insights — each one carries a hard number from the raw
// transaction data, the behavior it reveals, and a concrete action.
export function computeTransactionInsights(data: MemberData, transactions: TransactionData): BusinessInsight[] {
  const insights: BusinessInsight[] = [];
  const asOfDate = transactions.dateRange.max;

  // 1. Big Spender at Risk — sized against real visit recency. The visible
  // text stays brief; the named breakdown rides along in the agent prompt.
  const atRisk = computeAtRiskWithRecency(data.members, transactions.headers, asOfDate);
  if (atRisk.length > 0) {
    const totalAtRiskSpend = atRisk.reduce((s, m) => s + m.totalSpend, 0);
    insights.push({
      id: 'at-risk-recency',
      icon: 'siren',
      tone: 'risk',
      stat: `${atRisk.length}`,
      text: `Big Spender at Risk members worth ${formatCurrency(totalAtRiskSpend)} combined, verified against real visit history. Immediate win-back outreach recommended.`,
      actionLabel: 'Launch Win-Back Campaign',
      actionPrompt: `Draft a win-back campaign for our top at-risk members by spend: ${atRisk.slice(0, 5).map((m) => `${m.name} (${formatCurrency(m.totalSpend)}, ${m.daysSinceLastVisit ?? 'unknown'} days since last visit)`).join('; ')}. Total exposure: ${formatCurrency(totalAtRiskSpend)}.`,
    });
  }

  // 2. Recency cliff — high-value members whose silence just crossed the line
  const cliff = computeRecencyCliff(data.members, transactions.headers, asOfDate, 10_000, 60);
  if (cliff.length > 0) {
    const cliffSpend = cliff.reduce((s, m) => s + m.totalSpend, 0);
    insights.push({
      id: 'recency-cliff',
      icon: 'clock',
      tone: 'risk',
      stat: `${cliff.length}`,
      text: `members with SAR 10K+ lifetime spend haven't visited in 60+ days — ${formatCurrency(cliffSpend)} quietly walking out the door. Trigger win-back at day 45, before the cliff.`,
      actionLabel: 'Set 45-Day Win-Back Trigger',
      actionPrompt: `Design an automated win-back trigger that fires when a SAR 10K+ member goes 45 days without a visit. Current backlog crossing 60 days: ${cliff.slice(0, 5).map((m) => `${m.name} (${formatCurrency(m.totalSpend)}, ${m.daysSinceLastVisit} days)`).join('; ')}. Combined value ${formatCurrency(cliffSpend)}.`,
    });
  }

  // 3. Channel cross-sell targets — proven in one channel, absent in another
  const crossSell = computeCrossSellTargets(data.members, 8);
  if (crossSell.length > 0) {
    const top = crossSell.slice(0, 5);
    const provenSpend = crossSell.reduce((s, t) => s + t.strongSpend, 0);
    insights.push({
      id: 'cross-sell-targets',
      icon: 'target',
      tone: 'opportunity',
      stat: `${crossSell.length}`,
      text: `members are proven spenders in one channel (${formatCurrency(provenSpend)} combined) with zero footprint in another — a ready-made cross-sell target list. Prioritize by spend.`,
      actionLabel: 'Draft Cross-Sell Outreach',
      actionPrompt: `Draft a cross-sell outreach plan for these members, each strong in one channel but inactive in another: ${top.map((t) => `${t.name} — ${CHANNEL_LABELS[t.strongChannel]} spend ${formatCurrency(t.strongSpend)}, no ${t.missingChannels.map((c) => CHANNEL_LABELS[c]).join('/')} activity`).join('; ')}.`,
    });
  }

  // 4. Golf bundle opportunity — attach rate, expanded with where it happens
  const attach = computeGolfAttachRate(transactions.headers);
  const basket = computeGolfDayBasket(transactions.headers, transactions.items);
  if (attach.totalGolfVisits > 0) {
    const outlets = basket.topOutlets.map((o) => `${o.outlet} (${o.checks} checks, ${formatCurrency(o.revenue)})`).join(', ');
    const topOutlet = basket.topOutlets[0]?.outlet;
    insights.push({
      id: 'golf-attach-rate',
      icon: 'flag',
      tone: 'info',
      stat: `${attach.attachRate}%`,
      text: `of golf visits (${attach.attachedVisits} of ${attach.totalGolfVisits}) include same-day Retail or F&B spend worth ${formatCurrency(basket.attachRevenue)}${topOutlet ? `, mostly at ${topOutlet}` : ''}. Promote a "stay and shop" bundle at check-in to convert the other ${100 - attach.attachRate}%.`,
      actionLabel: 'Draft Bundle Promotion',
      actionPrompt: `Draft a "stay and shop" bundle promotion for golfers. ${attach.attachRate}% of golf visits (${attach.attachedVisits} of ${attach.totalGolfVisits}) already include same-day Retail/F&B spend worth ${formatCurrency(basket.attachRevenue)}, mostly at ${outlets || 'the clubhouse'}. Goal: convert more of the remaining ${attach.totalGolfVisits - attach.attachedVisits} golf-only visits.`,
    });
  }

  // 5. Basket composition — what golfers actually buy alongside a round
  if (basket.topItems.length > 0) {
    const items = basket.topItems.map((i) => `${i.name} (${i.count}×, ${formatCurrency(i.revenue)})`).join(', ');
    insights.push({
      id: 'golf-basket',
      icon: 'shopping-basket',
      tone: 'opportunity',
      stat: formatCurrency(basket.attachRevenue),
      text: `in same-day attach revenue rides along with golf rounds across ${basket.attachChecks} baskets, led by ${basket.topItems[0].name}. Merchandise the top attach items at the pro-shop counter and cart menu.`,
      actionLabel: 'Optimize Attach Placement',
      actionPrompt: `Golfers spend ${formatCurrency(basket.attachRevenue)} same-day across ${basket.attachChecks} attached baskets. Top items bought alongside a round: ${items}. Suggest merchandising and menu-placement moves to grow this attach revenue.`,
    });
  }

  // 6. Repeat-item loyalty — the auto-replenish / subscription hook
  const repeats = computeRepeatItemLoyalty(transactions.items, 3);
  if (repeats.memberCount > 0) {
    const tops = repeats.topItems.map((t) => `${t.name} (${t.members} members, ${t.purchases} purchases)`).join('; ');
    const topHabit = repeats.topItems[0];
    insights.push({
      id: 'repeat-item-loyalty',
      icon: 'repeat',
      tone: 'opportunity',
      stat: `${repeats.memberCount}`,
      text: `members bought the same item 3+ times (${repeats.pairCount} repeat habits), led by ${topHabit.name} (${topHabit.members} members). A built-in auto-replenish or "member favorite" offer.`,
      actionLabel: 'Design Replenish Offer',
      actionPrompt: `${repeats.memberCount} members have repeat-purchase habits (${repeats.pairCount} member-item pairs bought 3+ times). Top habits: ${tops}. Design an auto-replenish / favorites subscription offer around these items.`,
    });
  }

  return insights;
}
