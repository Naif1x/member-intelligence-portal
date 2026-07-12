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

// Agreed tax basis so every figure ties to the datagraph to the cent:
// Food = pre-tax (subtotal), Retail & Golf = tax-inclusive (total_amount).
// Golf transactions carry zero tax in this dataset, so its subtotal and
// total are identical — verified across every member/channel combination
// (0 exceptions).
export function getHeaderEffectiveAmount(h: TransactionHeader): number {
  return h.channel === 'food' ? h.subtotal : h.total_amount;
}

export function getItemEffectiveAmount(it: TransactionItem): number {
  return it.channel === 'food' ? it.line_amount : it.line_amount + it.line_tax;
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

// ---- Dashboard channel scoping ----------------------------------------
// 'all' | ChannelName drives every widget on the main dashboard at once.
import type { DashboardChannel } from '@/lib/store';
import { CHANNEL_SEGMENT_FIELD } from '@/types';

export function scopeHeaders(headers: TransactionHeader[], ch: DashboardChannel): TransactionHeader[] {
  return ch === 'all' ? headers : headers.filter((h) => h.channel === ch);
}

export function scopeItems(items: TransactionItem[], ch: DashboardChannel): TransactionItem[] {
  return ch === 'all' ? items : items.filter((it) => it.channel === ch);
}

export function memberActiveIn(m: Member, ch: DashboardChannel): boolean {
  if (ch === 'all') return true;
  return hasChannelData(m, ch);
}

export function memberSpendFor(m: Member, ch: DashboardChannel): number {
  return ch === 'all' ? m.total_spend : m[ch].spend;
}

export function memberSegmentFor(m: Member, ch: DashboardChannel): string {
  return ch === 'all' ? m.general_segment : (m[CHANNEL_SEGMENT_FIELD[ch]] as string);
}

// ---- Segment revenue concentration (the "recoverable revenue" widget) --

export const AT_RISK_SEGMENTS = ['Big Spender at Risk', 'Almost Lost'];

export interface SegmentRevenueRow {
  segment: string;
  revenue: number;
  members: number;
  atRisk: boolean;
}

export interface SegmentRevenueResult {
  rows: SegmentRevenueRow[];
  totalRevenue: number;
  recoverableRevenue: number;
  recoverableMembers: number;
}

export function computeSegmentRevenue(members: Member[], ch: DashboardChannel): SegmentRevenueResult {
  const bySegment = new Map<string, { revenue: number; members: number }>();
  let totalRevenue = 0;

  for (const m of members) {
    if (!memberActiveIn(m, ch)) continue;
    const segment = memberSegmentFor(m, ch);
    if (!segment || segment === 'No Data') continue;
    const spend = memberSpendFor(m, ch);
    if (!bySegment.has(segment)) bySegment.set(segment, { revenue: 0, members: 0 });
    const b = bySegment.get(segment)!;
    b.revenue += spend;
    b.members++;
    totalRevenue += spend;
  }

  const rows = [...bySegment.entries()]
    .map(([segment, b]) => ({
      segment,
      revenue: Math.round(b.revenue),
      members: b.members,
      atRisk: AT_RISK_SEGMENTS.includes(segment),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const recoverable = rows.filter((r) => r.atRisk);
  return {
    rows,
    totalRevenue: Math.round(totalRevenue),
    recoverableRevenue: recoverable.reduce((s, r) => s + r.revenue, 0),
    recoverableMembers: recoverable.reduce((s, r) => s + r.members, 0),
  };
}

// ---- RFM scatter (visits vs spend, real transaction counts) ------------

export interface ScatterPoint {
  name: string;
  visits: number;
  spend: number;
  segment: string;
}

export function computeRfmScatter(
  members: Member[],
  headers: TransactionHeader[],
  ch: DashboardChannel
): ScatterPoint[] {
  const visitCounts = new Map<string, number>();
  for (const h of scopeHeaders(headers, ch)) {
    visitCounts.set(h.unified_id, (visitCounts.get(h.unified_id) ?? 0) + 1);
  }

  const points: ScatterPoint[] = [];
  for (const m of members) {
    if (!memberActiveIn(m, ch)) continue;
    const segment = memberSegmentFor(m, ch);
    if (!segment || segment === 'No Data') continue;
    const visits = visitCounts.get(m.id) ?? 0;
    const spend = Math.round(memberSpendFor(m, ch));
    if (visits === 0 && spend === 0) continue;
    points.push({ name: m.name || m.id, visits, spend, segment });
  }
  return points;
}

// ---- Cross-shop overlaps (the bundling story, made visual) -------------

export interface CrossShopOverlap {
  label: string;
  members: number;
  avgSpend: number;
}

export interface CrossShopResult {
  overlaps: CrossShopOverlap[];
  sameDayVisits: number; // distinct member-days with 2+ channels transacted
  activeInScope: number;
}

export function computeCrossShop(
  members: Member[],
  headers: TransactionHeader[],
  ch: DashboardChannel,
  channelLabels: Record<ChannelName, string>
): CrossShopResult {
  const channels: ChannelName[] = ['golf', 'retail', 'food'];
  const active = (m: Member, c: ChannelName) => hasChannelData(m, c);

  function overlapRow(label: string, predicate: (m: Member) => boolean): CrossShopOverlap {
    const group = members.filter(predicate);
    const spend = group.reduce((s, m) => s + m.total_spend, 0);
    return { label, members: group.length, avgSpend: group.length ? spend / group.length : 0 };
  }

  let overlaps: CrossShopOverlap[];
  if (ch === 'all') {
    overlaps = [
      overlapRow(`${channelLabels.golf} + ${channelLabels.retail}`, (m) => active(m, 'golf') && active(m, 'retail')),
      overlapRow(`${channelLabels.golf} + ${channelLabels.food}`, (m) => active(m, 'golf') && active(m, 'food')),
      overlapRow(`${channelLabels.retail} + ${channelLabels.food}`, (m) => active(m, 'retail') && active(m, 'food')),
      overlapRow('All three channels', (m) => channels.every((c) => active(m, c))),
    ];
  } else {
    const others = channels.filter((c) => c !== ch);
    overlaps = [
      ...others.map((o) =>
        overlapRow(`${channelLabels[ch]} + ${channelLabels[o]}`, (m) => active(m, ch) && active(m, o))
      ),
      overlapRow(`${channelLabels[ch]} only`, (m) => active(m, ch) && others.every((o) => !active(m, o))),
    ];
  }

  // Distinct member-days where the member transacted in 2+ channels.
  const dayChannels = new Map<string, Set<ChannelName>>();
  for (const h of headers) {
    if (ch !== 'all' && h.channel !== ch) {
      // In scoped mode still count cross-shop days that involve the scoped
      // channel — so only skip days that never touch it (handled below).
    }
    const key = `${h.unified_id}|${h.date}`;
    if (!dayChannels.has(key)) dayChannels.set(key, new Set());
    dayChannels.get(key)!.add(h.channel);
  }
  let sameDayVisits = 0;
  for (const set of dayChannels.values()) {
    if (set.size >= 2 && (ch === 'all' || set.has(ch))) sameDayVisits++;
  }

  const activeInScope = ch === 'all' ? members.length : members.filter((m) => active(m, ch)).length;
  return { overlaps, sameDayVisits, activeInScope };
}

// ---- Cross-channel value, scoped variant --------------------------------

export interface ScopedValueBucket {
  label: string;
  count: number;
  avgSpend: number;
}

// In 'all' mode: 1/2/3-channel buckets. Scoped: members of that channel,
// split by how many channels they're in overall — same "more channels =
// more value" story, anchored on the selected channel.
export function computeCrossChannelValueScoped(members: Member[], ch: DashboardChannel): ScopedValueBucket[] {
  const channels: ChannelName[] = ['golf', 'retail', 'food'];
  const countChannels = (m: Member) => channels.filter((c) => hasChannelData(m, c)).length;

  const pool = ch === 'all' ? members : members.filter((m) => hasChannelData(m, ch));
  // Short labels — long tick labels get skipped by the axis auto-interval.
  const labels = ch === 'all'
    ? { 1: '1 Channel', 2: '2 Channels', 3: '3 Channels' }
    : { 1: 'This only', 2: '+1 channel', 3: 'All 3' };

  const buckets: Record<1 | 2 | 3, { count: number; spend: number }> = {
    1: { count: 0, spend: 0 }, 2: { count: 0, spend: 0 }, 3: { count: 0, spend: 0 },
  };
  for (const m of pool) {
    const n = countChannels(m);
    if (n < 1 || n > 3) continue;
    buckets[n as 1 | 2 | 3].count++;
    buckets[n as 1 | 2 | 3].spend += m.total_spend;
  }
  return ([1, 2, 3] as const).map((n) => ({
    label: labels[n],
    count: buckets[n].count,
    avgSpend: buckets[n].count ? buckets[n].spend / buckets[n].count : 0,
  }));
}

// ---- Repeat-item loyalty (bought 3+ times by the same member) -----------

export interface RepeatItemStats {
  pairCount: number;       // member×item combinations with 3+ purchases
  memberCount: number;     // distinct members with at least one such item
  topItems: { name: string; members: number; purchases: number }[];
}

export function computeRepeatItemLoyalty(items: TransactionItem[], minRepeats = 3): RepeatItemStats {
  // Count distinct transactions per member×item (quantity within one
  // check/basket isn't a repeat purchase).
  const txnsPerPair = new Map<string, Set<string>>();
  for (const it of items) {
    const key = `${it.unified_id}|${it.item_name}`;
    if (!txnsPerPair.has(key)) txnsPerPair.set(key, new Set());
    txnsPerPair.get(key)!.add(it.transaction_id);
  }

  const repeatMembers = new Set<string>();
  const byItem = new Map<string, { members: number; purchases: number }>();
  let pairCount = 0;
  for (const [key, txns] of txnsPerPair) {
    if (txns.size < minRepeats) continue;
    pairCount++;
    const [memberId, itemName] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
    repeatMembers.add(memberId);
    if (!byItem.has(itemName)) byItem.set(itemName, { members: 0, purchases: 0 });
    const b = byItem.get(itemName)!;
    b.members++;
    b.purchases += txns.size;
  }

  const topItems = [...byItem.entries()]
    .map(([name, b]) => ({ name, ...b }))
    .sort((a, b) => b.members - a.members || b.purchases - a.purchases)
    .slice(0, 3);

  return { pairCount, memberCount: repeatMembers.size, topItems };
}

// ---- Golf-day basket (what golfers buy alongside a round) ---------------

export interface GolfDayBasket {
  attachRevenue: number;
  attachChecks: number;
  topItems: { name: string; revenue: number; count: number }[];
  topOutlets: { outlet: string; checks: number; revenue: number }[];
}

export function computeGolfDayBasket(headers: TransactionHeader[], items: TransactionItem[]): GolfDayBasket {
  // Set of member-days that include a golf round.
  const golfDays = new Set<string>();
  for (const h of headers) {
    if (h.channel === 'golf') golfDays.add(`${h.unified_id}|${h.date}`);
  }

  // Non-golf transactions on those same days = the attached basket.
  const attachedTxnIds = new Set<string>();
  let attachRevenue = 0;
  const byOutlet = new Map<string, { checks: number; revenue: number }>();
  for (const h of headers) {
    if (h.channel === 'golf') continue;
    if (!golfDays.has(`${h.unified_id}|${h.date}`)) continue;
    attachedTxnIds.add(h.transaction_id);
    const amount = getHeaderEffectiveAmount(h);
    attachRevenue += amount;
    if (!byOutlet.has(h.outlet)) byOutlet.set(h.outlet, { checks: 0, revenue: 0 });
    const o = byOutlet.get(h.outlet)!;
    o.checks++;
    o.revenue += amount;
  }

  const byItem = new Map<string, { revenue: number; count: number }>();
  for (const it of items) {
    if (!attachedTxnIds.has(it.transaction_id)) continue;
    if (!byItem.has(it.item_name)) byItem.set(it.item_name, { revenue: 0, count: 0 });
    const b = byItem.get(it.item_name)!;
    b.revenue += getItemEffectiveAmount(it);
    b.count++;
  }

  return {
    attachRevenue: Math.round(attachRevenue),
    attachChecks: attachedTxnIds.size,
    topItems: [...byItem.entries()]
      .map(([name, b]) => ({ name, revenue: Math.round(b.revenue), count: b.count }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3),
    topOutlets: [...byOutlet.entries()]
      .map(([outlet, o]) => ({ outlet, checks: o.checks, revenue: Math.round(o.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3),
  };
}

// ---- Recency cliff (high-value members going quiet) ----------------------

export interface RecencyCliffMember {
  id: string;
  name: string;
  totalSpend: number;
  daysSinceLastVisit: number;
}

export function computeRecencyCliff(
  members: Member[],
  headers: TransactionHeader[],
  asOfDate: string,
  minSpend = 10_000,
  minDays = 60
): RecencyCliffMember[] {
  const lastVisitByMember = new Map<string, string>();
  for (const h of headers) {
    const current = lastVisitByMember.get(h.unified_id);
    if (!current || h.date > current) lastVisitByMember.set(h.unified_id, h.date);
  }

  const result: RecencyCliffMember[] = [];
  for (const m of members) {
    if (m.total_spend < minSpend) continue;
    const lastVisit = lastVisitByMember.get(m.id);
    if (!lastVisit) continue;
    const days = daysBetween(lastVisit, asOfDate);
    if (days < minDays) continue;
    result.push({ id: m.id, name: m.name, totalSpend: m.total_spend, daysSinceLastVisit: days });
  }
  return result.sort((a, b) => b.totalSpend - a.totalSpend);
}
