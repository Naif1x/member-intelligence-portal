export type ChannelName = 'golf' | 'retail' | 'food';

export interface ChannelMetrics {
  r: number;
  f: number;
  m: number;
  score: number;
  spend: number;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  golf: ChannelMetrics;
  retail: ChannelMetrics;
  food: ChannelMetrics;
  general: ChannelMetrics;
  golf_segment: string;
  retail_segment: string;
  food_segment: string;
  general_segment: string;
  flagged: boolean;
  total_spend: number;
}

export interface D360Metadata {
  source: string;
  exported: string;
  total_unified_profiles: number;
  total_source_records: number;
  identity_resolution: string;
}

export interface MemberData {
  metadata: D360Metadata;
  members: Member[];
}

export const SEGMENT_COLORS: Record<string, string> = {
  Champion: '#00BCD4',
  Loyal: '#0EA5E9',
  'Almost Loyal': '#22C55E',
  Occasional: '#A855F7',
  'Big Spender at Risk': '#FF9800',
  'Almost Lost': '#F43F5E',
  Lost: '#9CA3AF',
  'No Data': '#D1D5DB',
};

// Tremor chart color names mapped 1:1 with SEGMENT_COLORS above
export const SEGMENT_TREMOR_COLORS: Record<string, string> = {
  Champion: 'cyan',
  Loyal: 'blue',
  'Almost Loyal': 'green',
  Occasional: 'purple',
  'Big Spender at Risk': 'amber',
  'Almost Lost': 'rose',
  Lost: 'gray',
  'No Data': 'slate',
};

export const CHANNEL_COLORS: Record<ChannelName, string> = {
  golf: '#4CAF50',
  retail: '#0EA5E9',
  food: '#FF9800',
};

export const CHANNEL_TREMOR_COLORS: Record<ChannelName, string> = {
  golf: 'green',
  retail: 'blue',
  food: 'amber',
};

export const CHANNEL_LABELS: Record<ChannelName, string> = {
  golf: 'Golf',
  retail: 'Retail',
  food: 'Food & Beverage',
};

export const CHANNEL_SEGMENT_FIELD: Record<ChannelName, 'golf_segment' | 'retail_segment' | 'food_segment'> = {
  golf: 'golf_segment',
  retail: 'retail_segment',
  food: 'food_segment',
};

export function hasChannelData(m: Member, channel: ChannelName): boolean {
  return m[channel].score > 0 || m[channel].spend > 0;
}

export function getAtRiskChannels(m: Member): ChannelName[] {
  const channels: ChannelName[] = [];
  if (m.golf_segment === 'Big Spender at Risk') channels.push('golf');
  if (m.retail_segment === 'Big Spender at Risk') channels.push('retail');
  if (m.food_segment === 'Big Spender at Risk') channels.push('food');
  return channels;
}

export type SegmentTab = 'general' | ChannelName;

export const SEGMENT_FIELD_BY_TAB: Record<SegmentTab, keyof Member> = {
  general: 'general_segment',
  golf: 'golf_segment',
  retail: 'retail_segment',
  food: 'food_segment',
};

export const SEGMENT_TAB_LABELS: Record<SegmentTab, string> = {
  general: 'General',
  golf: 'Golf',
  retail: 'Retail',
  food: 'Food & Beverage',
};

export interface DataSummary {
  totalMembers: number;
  flaggedMembers: number;
  buyingMembers: number;
  championMembers: number;
  avgTotalSpend: number;
  avgFrequencyScore: number;
  totalSales: number;
  segmentDistribution: Record<string, number>;
  segmentDistributionByTab: Record<SegmentTab, Record<string, number>>;
  channelCoverage: Record<ChannelName, number>;
  channelSpend: Record<ChannelName, number>;
  recencyDistribution: { r: number; count: number }[];
  topMembersBySpend: Member[];
}

export function computeSummary(members: Member[]): DataSummary {
  const segmentDistribution: Record<string, number> = {};
  const segmentDistributionByTab: Record<SegmentTab, Record<string, number>> = {
    general: {},
    golf: {},
    retail: {},
    food: {},
  };
  const channelCoverage: Record<ChannelName, number> = { golf: 0, retail: 0, food: 0 };
  const channelSpend: Record<ChannelName, number> = { golf: 0, retail: 0, food: 0 };
  const recencyBuckets: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  let flaggedMembers = 0;
  let buyingMembers = 0;
  let championMembers = 0;
  let totalSpend = 0;
  let totalFreqScore = 0;

  members.forEach((m) => {
    segmentDistribution[m.general_segment] = (segmentDistribution[m.general_segment] || 0) + 1;
    (Object.keys(SEGMENT_FIELD_BY_TAB) as SegmentTab[]).forEach((tab) => {
      const seg = m[SEGMENT_FIELD_BY_TAB[tab]] as string;
      segmentDistributionByTab[tab][seg] = (segmentDistributionByTab[tab][seg] || 0) + 1;
    });
    (['golf', 'retail', 'food'] as ChannelName[]).forEach((ch) => {
      if (hasChannelData(m, ch)) channelCoverage[ch]++;
      channelSpend[ch] += m[ch].spend;
    });
    if (m.flagged) flaggedMembers++;
    if (m.total_spend > 0) buyingMembers++;
    if (m.general_segment === 'Champion') championMembers++;
    totalSpend += m.total_spend;
    totalFreqScore += m.general.f;
    recencyBuckets[m.general.r] = (recencyBuckets[m.general.r] || 0) + 1;
  });

  const topMembersBySpend = [...members].sort((a, b) => b.total_spend - a.total_spend).slice(0, 10);

  return {
    totalMembers: members.length,
    flaggedMembers,
    buyingMembers,
    championMembers,
    avgTotalSpend: members.length ? Math.round(totalSpend / members.length) : 0,
    avgFrequencyScore: members.length ? Math.round((totalFreqScore / members.length) * 10) / 10 : 0,
    totalSales: Math.round(totalSpend),
    segmentDistribution,
    segmentDistributionByTab,
    channelCoverage,
    channelSpend,
    recencyDistribution: [0, 1, 2, 3, 4].map((r) => ({ r, count: recencyBuckets[r] || 0 })),
    topMembersBySpend,
  };
}

export const SEGMENT_ACTIONS: Record<string, string> = {
  Champion: 'Protect and reward — invite to VIP events and early access offers.',
  Loyal: 'Deepen engagement — introduce them to a channel they haven\'t tried yet.',
  'Almost Loyal': 'Push toward loyalty with a targeted frequency incentive.',
  Occasional: 'Increase visit cadence with a limited-time reactivation offer.',
  'Big Spender at Risk': 'Immediate win-back outreach — high value, declining recency.',
  'Almost Lost': 'Last-chance re-engagement campaign before full churn.',
  Lost: 'Low-cost reactivation blast; deprioritize high-touch outreach.',
  'No Data': 'Insufficient signal — verify identity resolution for this profile.',
};
