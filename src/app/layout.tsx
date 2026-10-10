import type { Metadata } from 'next';
import './globals.css';
import { getActiveTheme } from '@/lib/theme-config';
import { GlobalPastelBackground } from '@/components/GlobalPastelBackground';

export const metadata: Metadata = {
  title: 'QLess - Campus Canteen Ordering & Batch Queue System',
  description: 'Smart campus food ordering with exact pickup times and 15-minute preparation batches.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = getActiveTheme();

  return (
    <html lang="en" data-theme={theme}>
      <body className="min-h-screen text-text-primary antialiased relative">
        <GlobalPastelBackground />
        {children}
      </body>
    </html>
  );
}
