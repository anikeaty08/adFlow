import type { Metadata } from 'next';
import './globals.css';
import { FrontendProviders } from '@/components/providers/frontend-providers';

export const metadata: Metadata = {
  title: 'AdFlow | Autonomous advertising on Celo',
  description: 'Agent-led publisher discovery, measured delivery, and transparent stablecoin settlement.',
  icons: {
    apple: '/brand/adflow-symbol.png',
    icon: '/brand/adflow-symbol.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <FrontendProviders>{children}</FrontendProviders>
      </body>
    </html>
  );
}
