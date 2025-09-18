import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AppContent } from './app-content';
import { Inter } from 'next/font/google';
import { Providers } from './providers';


const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Safeviate',
  description: 'Modern Aviation Management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SkyBound',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable}`}>
      <head>
          <meta name="theme-color" content="#2563eb" />
      </head>
      <body>
          <Providers>
            <AppContent>
              {children}
            </AppContent>
            <Toaster />
          </Providers>
      </body>
    </html>
  );
}
