export interface ChannelMetrics {
  recencyDays: number;
  frequency: number;
  monetary: number;
  r: number;
  f: number;
  m: number;
  rfmScore: string;
  lastActivity: string;
  transactions: Transaction[];
}

export interface Transaction {
  date: string;
  amount: number;
  [key: string]: unknown;
}

export interface GeneralRFM {
  r: number;
  f: number;
  m: number;
  rfmScore: string;
  totalMonetary: number;
}

export type Segment =
  | 'Champions'
  | 'Loyal'
  | 'Almost Loyal'
  | 'Occasional'
  | 'Big Spenders'
  | 'Big Spenders at Risk'
  | 'Almost Lost'
  | 'Lost';

export type ChannelName = 'golf' | 'retail' | 'food';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  city: string | null;
  membershipNo: string | null;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  autoRenew: boolean;
  isActive: boolean;
  isMember: boolean;
  handicap: number | null;
  platformType: string | null;
  channels: {
    golf: ChannelMetrics | null;
    retail: ChannelMetrics | null;
    food: ChannelMetrics | null;
  };
  general: GeneralRFM;
  segment: Segment;
  atRisk: boolean;
  atRiskChannels: ChannelName[];
  systems: string[];
}

export interface DataSummary {
  totalMembers: number;
  activeSubscriptions: number;
  atRiskMembers: number;
  avgLifetimeValue: number;
  segmentDistribution: Record<string, number>;
  channelCoverage: Record<ChannelName, number>;
  systemsCoverage: Record<string, number>;
}

export interface MemberData {
  members: Member[];
  summary: DataSummary;
}

export const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#2E844A',
  Loyal: '#0176D3',
  'Almost Loyal': '#1B96FF',
  Occasional: '#9050E9',
  'Big Spenders': '#DD7A01',
  'Big Spenders at Risk': '#C23934',
  'Almost Lost': '#FE5C4C',
  Lost: '#8B8D8F',
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
