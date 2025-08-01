
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { AppContent } from './app-content';
import { Inter } from 'next/font/google';
import { ScaleProvider } from '@/context/scale-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
          <meta name="theme-color" content="#2563eb" />
          <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>
          <UserProvider>
            <SettingsProvider>
              <ScaleProvider>
                <SidebarProvider>
                  <AppContent>
                    {children}
                  </AppContent>
                </SidebarProvider>
                <Toaster />
              </ScaleProvider>
            </SettingsProvider>
          </UserProvider>
      </body>
    </html>
  );
}
