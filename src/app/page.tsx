'use client';

import AppProvider from '@/components/layout/AppProvider';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import KPICards from '@/components/dashboard/KPICards';
import { SegmentDonut, ChannelBar, ChannelCoverage } from '@/components/dashboard/Charts';
import Filters from '@/components/dashboard/Filters';
import MemberTable from '@/components/dashboard/MemberTable';
import AgentforceModal from '@/components/chat/AgentforceModal';
import { useApp } from '@/lib/store';

function DashboardContent() {
  const { loading } = useApp();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--sf-surface)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm" style={{ color: 'var(--sf-text-secondary)' }}>Loading member data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--sf-surface)' }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--sf-primary)' }}>
          Member Intelligence Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sf-text-secondary)' }}>
          Unified D360 view across Golf, Retail, and F&B channels
        </p>
      </div>

      <KPICards />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SegmentDonut />
        <ChannelBar />
        <ChannelCoverage />
      </div>

      <Filters />
      <MemberTable />
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <DashboardContent />
        <RightPanel />
        <AgentforceModal />
      </div>
    </AppProvider>
  );
}
