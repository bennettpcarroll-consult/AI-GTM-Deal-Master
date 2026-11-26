import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/geist';
import './globals.css';
import { FreshBuild } from '@/components/fresh-build';

export const metadata: Metadata = {
  title: 'Deal Master',
  description: 'Enterprise AI sales practice, graded on verbatim buyer evidence. Build MEDDPICC, consumption and executive selling skills a few minutes at a time.'
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <FreshBuild />
        {children}
      </body>
    </html>
  );
}
