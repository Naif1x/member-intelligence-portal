'use client';

import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import RightPanel from '@/components/layout/RightPanel';
import KPICards from '@/components/dashboard/KPICards';
import {
  SegmentDonut, RevenueDonut, TopMembersBySpend,
  CrossChannelValueChart, TopItemsChart, SpendTrendChart,
} from '@/components/dashboard/Charts';
import Filters from '@/components/dashboard/Filters';
import FilterBreadcrumb from '@/components/dashboard/FilterBreadcrumb';
import MemberTable from '@/components/dashboard/MemberTable';
import CampaignAnalysis from '@/components/dashboard/CampaignAnalysis';
import BusinessInsightsPanel from '@/components/dashboard/BusinessInsightsPanel';
import Settings from '@/components/settings/Settings';
import { Button } from '@heroui/react';
import { useApp } from '@/lib/store';

function DashboardContent() {
  const { loading, view, businessInsightsOpen, setBusinessInsightsOpen } = useApp();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--sf-surface)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--sf-border)', borderTopColor: 'var(--sf-accent)' }} />
          <div className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Loading member data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24" style={{ background: 'var(--sf-surface)' }}>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--sf-primary)' }}>
            Member Intelligence Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sf-text-secondary)' }}>
            Unified D360 view across Golf, Retail, and F&B channels
          </p>
        </div>
        {view !== 'settings' && (
          <Button
            onPress={() => setBusinessInsightsOpen(!businessInsightsOpen)}
            className="text-white flex-shrink-0"
            style={{ background: 'var(--sf-primary)' }}
          >
            💡 Business Insights
          </Button>
        )}
      </div>

      {view === 'dashboard' && <KPICards />}

      {view === 'dashboard' && (
        <div className="flex flex-col gap-4 mb-6">
          <CrossChannelValueChart />
          <SpendTrendChart />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SegmentDonut />
            <RevenueDonut />
          </div>
          <TopItemsChart />
          <TopMembersBySpend />
        </div>
      )}

      {view === 'segments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SegmentDonut />
          <RevenueDonut />
        </div>
      )}

      {view === 'settings' ? (
        <Settings />
      ) : view === 'campaigns' ? (
        <CampaignAnalysis />
      ) : view === 'segments' ? null : (
        <>
          <FilterBreadcrumb />
          <Filters />
          <MemberTable />
        </>
      )}
    </div>
  );
}

function Shell() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <DashboardContent />
        <RightPanel />
        <BusinessInsightsPanel />
      </div>
    </div>
  );
}

export default function Home() {
  return <Shell />;
}
