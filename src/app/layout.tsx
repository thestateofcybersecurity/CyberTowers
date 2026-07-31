import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CyberTowers',
  description:
    'A cybersecurity tower defence game. Stand up firewalls, IDS sensors and AI sentinels against viruses, ransomware and zero-days before they reach your core.',
  applicationName: 'CyberTowers',
  openGraph: {
    title: 'CyberTowers',
    description: 'Defend the network. A cybersecurity tower defence game.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#05070f',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative z-0 flex min-h-full flex-col">{children}</body>
    </html>
  );
}
