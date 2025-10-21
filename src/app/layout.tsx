import type {Metadata} from 'next';
import './globals.css';
import { ClientProviders } from './client-providers';
import { Inter } from 'next/font/google';


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
          <ClientProviders>
            {children}
          </ClientProviders>
      </body>
    </html>
  );
}
