import type {Metadata} from 'next';
import './globals.css';
import { ClientProviders } from './client-providers';
import { Inter } from 'next/font/google';
import Script from 'next/script';


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
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
            strategy="beforeInteractive"
          />
      </head>
      <body>
          <ClientProviders>
            {children}
          </ClientProviders>
      </body>
    </html>
  );
}
