import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QLess - Campus Canteen Ordering & Batch Queue System',
  description: 'Smart campus food ordering with exact pickup times and 15-minute preparation batches.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
