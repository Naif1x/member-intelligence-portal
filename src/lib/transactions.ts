import type { ChannelName, Member } from '@/types';
import { hasChannelData } from '@/types';
import type { TransactionHeader, TransactionItem, TransactionData } from '@/types/transactions';

let cachedTransactions: TransactionData | null = null;

export async function getTransactionData(): Promise<TransactionData> {
  if (cachedTransactions) return cachedTransactions;
  const res = await fetch('/data/transactions.json');
  cachedTransactions = await res.json();
  return cachedTransactions!;
}

// The datagraph's per-channel member.spend figures were generated with an
// inconsistent tax convention upstream: golf and food are pre-tax
// (subtotal), retail is tax-inclusive (total_amount) — verified across
// every member/channel combination in the dataset (0 exceptions). Matching
// it exactly here is what makes every new figure tie back to the
// datagraph to the cent, per the reconciliation requirement.
export function getHeaderEffectiveAmount(h: TransactionHeader): number {
  return h.channel === 'retail' ? h.total_amount : h.subtotal;
}

export function getItemEffectiveAmount(it: TransactionItem): number {
  return it.channel === 'retail' ? it.line_amount + it.line_tax : it.line_amount;
}

export interface ActivityRow {
  id: string;
  label: string;
  amount: number;
  date: string;
  daysAgo: number;
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

// Item-level rows for a member's channel card on the Member 360 page —
// real purchases/rounds/checks, sorted most recent first.
export function getMemberChannelActivity(
  items: TransactionItem[],
  unifiedId: string,
  channel: ChannelName,
  asOfDate: string
): ActivityRow[] {
  return items
    .filter((it) => it.unified_id === unifiedId && it.channel === channel)
    .map((it) => ({
      id: `${it.transaction_id}-${it.item_id}`,
      label: it.quantity > 1 ? `${it.item_name} ×${it.quantity}` : it.item_name,
      amount: getItemEffectiveAmount(it),
      date: it.date,
      daysAgo: daysBetween(it.date, asOfDate),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface ChannelCountBucket {
  count: number;
  avgSpend: number;
  totalSpend: number;
}

// How many channels each member is active in, and whether tri-channel
// members really are the highest-value segment (they are — this is the
// dashboard's headline cross-channel insight).
export function computeCrossChannelValue(members: Member[]): Record<1 | 2 | 3, ChannelCountBucket> {
  const buckets: Record<1 | 2 | 3, { spend: number; count: number }> = {
    1: { spend: 0, count: 0 },
    2: { spend: 0, count: 0 },
    3: { spend: 0, count: 0 },
  };
  for (const m of members) {
    const activeChannels = (['golf', 'retail', 'food'] as ChannelName[]).filter((ch) => hasChannelData(m, ch));
    const n = activeChannels.length;
    if (n < 1 || n > 3) continue;
    const bucket = buckets[n as 1 | 2 | 3];
    bucket.count++;
    bucket.spend += m.total_spend;
  }
  return {
    1: { count: buckets[1].count, totalSpend: buckets[1].spend, avgSpend: buckets[1].count ? buckets[1].spend / buckets[1].count : 0 },
    2: { count: buckets[2].count, totalSpend: buckets[2].spend, avgSpend: buckets[2].count ? buckets[2].spend / buckets[2].count : 0 },
    3: { count: buckets[3].count, totalSpend: buckets[3].spend, avgSpend: buckets[3].count ? buckets[3].spend / buckets[3].count : 0 },
  };
}

export interface ItemRevenue {
  name: string;
  revenue: number;
}

export function getTopItemsByRevenue(items: TransactionItem[], limit = 10): ItemRevenue[] {
  const totals = new Map<string, number>();
  for (const it of items) {
    totals.set(it.item_name, (totals.get(it.item_name) ?? 0) + getItemEffectiveAmount(it));
  }
  return [...totals.entries()]
    .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export interface MonthlySpend {
  month: string;
  golf: number;
  retail: number;
  food: number;
}

export function computeMonthlySpendTrend(headers: TransactionHeader[]): MonthlySpend[] {
  const byMonth = new Map<string, MonthlySpend>();
  for (const h of headers) {
    const month = h.date.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) byMonth.set(month, { month, golf: 0, retail: 0, food: 0 });
    byMonth.get(month)![h.channel] += getHeaderEffectiveAmount(h);
  }
  return [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, golf: Math.round(m.golf), retail: Math.round(m.retail), food: Math.round(m.food) }));
}

export interface AtRiskMember {
  id: string;
  name: string;
  totalSpend: number;
  daysSinceLastVisit: number | null;
}

// Cross-references the datagraph's at-risk segment with actual last-visit
// recency — the concrete, actionable version of "at risk."
export function computeAtRiskWithRecency(
  members: Member[],
  headers: TransactionHeader[],
  asOfDate: string
): AtRiskMember[] {
  const lastVisitByMember = new Map<string, string>();
  for (const h of headers) {
    const current = lastVisitByMember.get(h.unified_id);
    if (!current || h.date > current) lastVisitByMember.set(h.unified_id, h.date);
  }

  return members
    .filter((m) => m.flagged)
    .map((m) => {
      const lastVisit = lastVisitByMember.get(m.id);
      return {
        id: m.id,
        name: m.name,
        totalSpend: m.total_spend,
        daysSinceLastVisit: lastVisit ? daysBetween(lastVisit, asOfDate) : null,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

export interface CrossSellTarget {
  id: string;
  name: string;
  strongChannel: ChannelName;
  strongSpend: number;
  missingChannels: ChannelName[];
}

// Members proven in one channel with zero footprint in another — the
// "who to target" list for cross-channel promotion.
export function computeCrossSellTargets(members: Member[], limit = 10): CrossSellTarget[] {
  const channels: ChannelName[] = ['golf', 'retail', 'food'];
  const targets: CrossSellTarget[] = [];

  for (const m of members) {
    const active = channels.filter((ch) => hasChannelData(m, ch));
    const missing = channels.filter((ch) => !hasChannelData(m, ch));
    if (active.length === 0 || missing.length === 0) continue;

    const strongChannel = active.reduce((a, b) => (m[b].spend > m[a].spend ? b : a));
    targets.push({
      id: m.id,
      name: m.name,
      strongChannel,
      strongSpend: m[strongChannel].spend,
      missingChannels: missing,
    });
  }

  return targets.sort((a, b) => b.strongSpend - a.strongSpend).slice(0, limit);
}

export interface AttachRateResult {
  totalGolfVisits: number;
  attachedVisits: number;
  attachRate: number;
}

// For golf visits, what share also have a retail or F&B transaction from
// the same member within a day — the cross-channel "proof" stat.
export function computeGolfAttachRate(headers: TransactionHeader[]): AttachRateResult {
  const byMember = new Map<string, TransactionHeader[]>();
  for (const h of headers) {
    if (!byMember.has(h.unified_id)) byMember.set(h.unified_id, []);
    byMember.get(h.unified_id)!.push(h);
  }

  let totalGolfVisits = 0;
  let attachedVisits = 0;

  for (const rows of byMember.values()) {
    const golfVisits = rows.filter((r) => r.channel === 'golf');
    const otherVisits = rows.filter((r) => r.channel !== 'golf');
    for (const gv of golfVisits) {
      totalGolfVisits++;
      const golfTime = new Date(gv.date).getTime();
      const hasAttach = otherVisits.some((ov) => Math.abs(new Date(ov.date).getTime() - golfTime) <= 86_400_000);
      if (hasAttach) attachedVisits++;
    }
  }

  return {
    totalGolfVisits,
    attachedVisits,
    attachRate: totalGolfVisits ? Math.round((attachedVisits / totalGolfVisits) * 100) : 0,
  };
}
