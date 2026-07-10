import type { MemberData, Member } from '@/types';

let cachedData: MemberData | null = null;

export async function getMemberData(): Promise<MemberData> {
  if (cachedData) return cachedData;
  const res = await fetch('/data/members.json');
  cachedData = await res.json();
  return cachedData!;
}

export function getSegmentIcon(segment: string): string {
  const icons: Record<string, string> = {
    Champions: '🏆',
    Loyal: '💎',
    'Almost Loyal': '📈',
    Occasional: '🎯',
    'Big Spenders': '💰',
    'Big Spenders at Risk': '⚠️',
    'Almost Lost': '📉',
    Lost: '❌',
  };
  return icons[segment] || '•';
}

export function formatCurrency(amount: number): string {
  return `SAR ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function getRFMLabel(score: number): string {
  if (score >= 4) return 'Excellent';
  if (score >= 3) return 'Good';
  if (score >= 2) return 'Fair';
  return 'Poor';
}

export function getMemberName(m: Member): string {
  return `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
}

export function getChannelCount(m: Member): number {
  return [m.channels.golf, m.channels.retail, m.channels.food].filter(Boolean).length;
}
