import type { MemberData, Member } from '@/types';

let cachedData: MemberData | null = null;

export async function getMemberData(): Promise<MemberData> {
  if (cachedData) return cachedData;
  const res = await fetch('/data/d360_datagraph_export.json');
  cachedData = await res.json();
  return cachedData!;
}

export function getSegmentIcon(segment: string): string {
  const icons: Record<string, string> = {
    Champion: '🏆',
    Loyal: '💎',
    'Almost Loyal': '📈',
    Occasional: '🎯',
    'Big Spender at Risk': '⚠️',
    'Almost Lost': '📉',
    Lost: '❌',
    'No Data': '•',
  };
  return icons[segment] || '•';
}

export function formatCurrency(amount: number): string {
  return `SAR ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function getMemberName(m: Member): string {
  const name = m.name?.trim();
  if (name) return name;
  if (m.email) return m.email;
  if (m.phone) return `Unresolved Guest (${m.phone})`;
  return 'Unresolved Guest';
}

export function getMemberInitials(m: Member): string {
  const name = m.name?.trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getGenderLabel(gender: string): string {
  return gender === '1' ? 'Male' : gender === '0' ? 'Female' : '—';
}
