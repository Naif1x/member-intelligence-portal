'use client';

import { Chip } from '@heroui/react';
import { SEGMENT_COLORS } from '@/types';
import { getSegmentIcon } from '@/lib/data';

// 'No Data' gets a neutral gray treatment; its palette color (#D1D5DB) is too
// light to double as legible text.
const NO_DATA_STYLE = { background: '#F3F4F6', color: '#6B7280' };

export default function SegmentChip({
  segment,
  showIcon = false,
  size = 'sm',
  className = '',
}: {
  segment: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const color = SEGMENT_COLORS[segment] || '#9CA3AF';
  const style = segment === 'No Data' ? NO_DATA_STYLE : { background: `${color}1A`, color };
  const Icon = getSegmentIcon(segment);
  return (
    <Chip size={size} className={`whitespace-nowrap font-semibold gap-1 ${className}`} style={style}>
      {showIcon && <Icon size={12} strokeWidth={2.5} className="flex-shrink-0" />}
      {segment}
    </Chip>
  );
}
