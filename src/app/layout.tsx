
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { AppContent } from './app-content';
import { Inter, Roboto, Lato, Montserrat } from 'next/font/google';
import { ScaleProvider } from '@/context/scale-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-roboto',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-montserrat',
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${roboto.variable} ${lato.variable} ${montserrat.variable}`}>
      <head>
          <meta name="theme-color" content="#2563eb" />
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
