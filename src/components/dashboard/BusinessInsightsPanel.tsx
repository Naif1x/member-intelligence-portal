'use client';

import { useMemo } from 'react';
import { Button, Card } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, X, Trophy, TrendingDown, AlertTriangle, BarChart3, ShieldCheck, Siren, Target, Flag, Repeat, ShoppingBasket, Clock, type LucideIcon } from 'lucide-react';
import { useApp } from '@/lib/store';
import { computeBusinessInsights, computeTransactionInsights, type BusinessInsight, type InsightIcon } from '@/lib/insights';

const TONE_COLORS: Record<BusinessInsight['tone'], string> = {
  opportunity: 'var(--sf-accent)',
  risk: 'var(--sf-warning)',
  info: '#0EA5E9',
};

const INSIGHT_ICONS: Record<InsightIcon, LucideIcon> = {
  trophy: Trophy,
  'trending-down': TrendingDown,
  'alert-triangle': AlertTriangle,
  lightbulb: Lightbulb,
  'bar-chart': BarChart3,
  shield: ShieldCheck,
  siren: Siren,
  target: Target,
  flag: Flag,
  repeat: Repeat,
  'shopping-basket': ShoppingBasket,
  clock: Clock,
};

function InsightCard({ insight, onAction }: { insight: BusinessInsight; onAction: (prompt: string) => void }) {
  const color = TONE_COLORS[insight.tone];
  const Icon = INSIGHT_ICONS[insight.icon];
  return (
    <Card className="mb-3 border-t-4" style={{ borderTopColor: color }}>
      <Card.Content className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1A`, color }}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--sf-text)' }}>
            <span className="font-bold" style={{ color }}>{insight.stat}</span> {insight.text}
          </p>
        </div>
        <Button
          size="sm"
          onPress={() => onAction(insight.actionPrompt)}
          className="text-white"
          style={{ background: color }}
        >
          {insight.actionLabel}
        </Button>
      </Card.Content>
    </Card>
  );
}

export default function BusinessInsightsPanel() {
  const { businessInsightsOpen, setBusinessInsightsOpen, data, transactions, openChatWithContext } = useApp();
  const insights = useMemo(() => {
    if (!data) return [];
    const base = computeBusinessInsights(data);
    const txn = transactions ? computeTransactionInsights(data, transactions) : [];
    // Transaction-backed insights (real visit history) lead, since they're
    // the most concrete/actionable for the demo.
    return [...txn, ...base];
  }, [data, transactions]);

  return (
    <AnimatePresence>
      {businessInsightsOpen && (
        <>
          {/* Backdrop — dims the page behind the panel instead of squeezing
              the layout, matching a standard overlay drawer. */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 hidden lg:block"
            onClick={() => setBusinessInsightsOpen(false)}
          />
          <motion.aside
            key="panel"
            initial={{ x: 440, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 440, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full z-50 border-l overflow-y-auto hidden lg:flex lg:flex-col shadow-2xl"
            style={{ width: 440, borderColor: 'var(--sf-border)', background: 'var(--sf-surface)' }}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--sf-border)', background: 'white' }}>
              <div>
                <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--sf-primary)' }}>
                  <Lightbulb size={16} strokeWidth={2} style={{ color: 'var(--sf-accent)' }} />
                  Business Insights
                </div>
                <div className="text-xs" style={{ color: 'var(--sf-text-secondary)' }}>
                  AI-generated, portfolio-wide
                </div>
              </div>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                aria-label="Close business insights panel"
                onPress={() => setBusinessInsightsOpen(false)}
                className="text-gray-500"
              >
                <X size={16} strokeWidth={2} />
              </Button>
            </div>

            <div className="p-4 overflow-y-auto">
              {insights.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Not enough data yet to generate insights.</p>
              ) : (
                insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} onAction={openChatWithContext} />
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
