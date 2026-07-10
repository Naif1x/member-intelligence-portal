import type { Metadata } from 'next';
import './globals.css';

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
      <body className="h-full">{children}</body>
    </html>
  );
}
