import type { Metadata } from 'next';
import './globals.css';
import AppProvider from '@/components/layout/AppProvider';
import AgentforceModal from '@/components/chat/AgentforceModal';

export const metadata: Metadata = {
  title: 'Member D360 | Intelligence Platform',
  description: 'Salesforce Data Cloud 360 — Member Intelligence Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">
        <AppProvider>
          {children}
          <AgentforceModal />
        </AppProvider>
      </body>
    </html>
  );
}
