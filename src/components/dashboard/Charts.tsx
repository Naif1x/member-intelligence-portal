'use client';

import { useApp } from '@/lib/store';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { SEGMENT_COLORS, CHANNEL_COLORS, type ChannelName } from '@/types';

export function SegmentDonut() {
  const { data } = useApp();
  if (!data) return null;

  const chartData = Object.entries(data.summary.segmentDistribution).map(([name, value]) => ({
    name,
    value,
    color: SEGMENT_COLORS[name] || '#8B8D8F',
  }));

  return (
    <div className="slds-card p-4">
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>
        Segment Distribution
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} members`]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="text-[11px]" style={{ color: 'var(--sf-text-secondary)' }}>
              {d.name} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelBar() {
  const { data } = useApp();
  if (!data) return null;

  const channelSpend: Record<ChannelName, number> = { golf: 0, retail: 0, food: 0 };
  data.members.forEach((m) => {
    if (m.channels.golf) channelSpend.golf += m.channels.golf.monetary;
    if (m.channels.retail) channelSpend.retail += m.channels.retail.monetary;
    if (m.channels.food) channelSpend.food += m.channels.food.monetary;
  });

  const chartData = [
    { name: 'Golf', value: Math.round(channelSpend.golf), fill: CHANNEL_COLORS.golf },
    { name: 'Retail', value: Math.round(channelSpend.retail), fill: CHANNEL_COLORS.retail },
    { name: 'F&B', value: Math.round(channelSpend.food), fill: CHANNEL_COLORS.food },
  ];

  return (
    <div className="slds-card p-4">
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>
        Revenue by Channel
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis type="number" tickFormatter={(v) => `${Math.round(v / 1000)}K`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={50} />
            <Tooltip
              formatter={(value) => [`SAR ${Number(value).toLocaleString()}`, 'Revenue']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
            <span className="text-[11px]" style={{ color: 'var(--sf-text-secondary)' }}>
              {d.name}: SAR {(d.value / 1000).toFixed(0)}K
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChannelCoverage() {
  const { data } = useApp();
  if (!data) return null;

  const segments = Object.entries(data.summary.segmentDistribution);
  const segmentMembers: Record<string, { golf: number; retail: number; food: number }> = {};

  segments.forEach(([seg]) => {
    segmentMembers[seg] = { golf: 0, retail: 0, food: 0 };
  });

  data.members.forEach((m) => {
    if (!segmentMembers[m.segment]) return;
    if (m.channels.golf) segmentMembers[m.segment].golf++;
    if (m.channels.retail) segmentMembers[m.segment].retail++;
    if (m.channels.food) segmentMembers[m.segment].food++;
  });

  const chartData = segments.map(([seg]) => ({
    name: seg,
    Golf: segmentMembers[seg]?.golf || 0,
    Retail: segmentMembers[seg]?.retail || 0,
    'F&B': segmentMembers[seg]?.food || 0,
  }));

  return (
    <div className="slds-card p-4">
      <div className="text-sm font-bold mb-3" style={{ color: 'var(--sf-primary)' }}>
        Channel Coverage by Segment
      </div>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: -10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Golf" stackId="a" fill={CHANNEL_COLORS.golf} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Retail" stackId="a" fill={CHANNEL_COLORS.retail} />
            <Bar dataKey="F&B" stackId="a" fill={CHANNEL_COLORS.food} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
