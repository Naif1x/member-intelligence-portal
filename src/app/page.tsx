'use client';

import AppProvider from '@/components/layout/AppProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import RightPanel from '@/components/layout/RightPanel';
import KPICards from '@/components/dashboard/KPICards';
import { SegmentDonut, ChannelBar, TopMembersBySpend } from '@/components/dashboard/Charts';
import Filters from '@/components/dashboard/Filters';
import FilterBreadcrumb from '@/components/dashboard/FilterBreadcrumb';
import MemberTable from '@/components/dashboard/MemberTable';
import CampaignAnalysis from '@/components/dashboard/CampaignAnalysis';
import AgentforceModal from '@/components/chat/AgentforceModal';
import { useApp } from '@/lib/store';

function DashboardContent() {
  const { loading, view } = useApp();

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
    <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--sf-surface)' }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--sf-primary)' }}>
          Member Intelligence Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sf-text-secondary)' }}>
          Unified D360 view across Golf, Retail, and F&B channels
        </p>
      </div>

      {(view === 'dashboard' || view === 'members') && <KPICards />}

      {view === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SegmentDonut />
          <ChannelBar />
          <div className="lg:col-span-2">
            <TopMembersBySpend />
          </div>
        </div>
      )}

      {view === 'segments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SegmentDonut />
          <ChannelBar />
        </div>
      )}

      {view === 'campaigns' ? (
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
        <AgentforceModal />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
