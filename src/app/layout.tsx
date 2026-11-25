import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI GTM: Deal Master',
  description: 'Gamified AI GTM training from the Profit, Not Pilot brand system. Graded on verbatim buyer evidence.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] antialiased">{children}</body>
    </html>
  );
}
