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
  Champion: '#2E844A',
  Loyal: '#0176D3',
  'Almost Loyal': '#1B96FF',
  Occasional: '#9050E9',
  'Big Spender at Risk': '#C23934',
  'Almost Lost': '#FE5C4C',
  Lost: '#8B8D8F',
  'No Data': '#C9C7C5',
};

export const CHANNEL_COLORS: Record<ChannelName, string> = {
  golf: '#2E844A',
  retail: '#0176D3',
  food: '#DD7A01',
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

export interface DataSummary {
  totalMembers: number;
  flaggedMembers: number;
  avgTotalSpend: number;
  segmentDistribution: Record<string, number>;
  channelCoverage: Record<ChannelName, number>;
}

export function computeSummary(members: Member[]): DataSummary {
  const segmentDistribution: Record<string, number> = {};
  const channelCoverage: Record<ChannelName, number> = { golf: 0, retail: 0, food: 0 };
  let flaggedMembers = 0;
  let totalSpend = 0;

  members.forEach((m) => {
    segmentDistribution[m.general_segment] = (segmentDistribution[m.general_segment] || 0) + 1;
    (['golf', 'retail', 'food'] as ChannelName[]).forEach((ch) => {
      if (hasChannelData(m, ch)) channelCoverage[ch]++;
    });
    if (m.flagged) flaggedMembers++;
    totalSpend += m.total_spend;
  });

  return {
    totalMembers: members.length,
    flaggedMembers,
    avgTotalSpend: members.length ? Math.round(totalSpend / members.length) : 0,
    segmentDistribution,
    channelCoverage,
  };
}
