
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { AppContent } from './app-content';
import { Inter } from 'next/font/google';
import { ScaleProvider } from '@/context/scale-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});


export const metadata: Metadata = {
  title: 'Safeviate',
  description: 'Modern Aviation Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ScaleProvider>
            <UserProvider>
              <SettingsProvider>
                <AppContent>
                  {children}
                </AppContent>
                <Toaster />
              </SettingsProvider>
            </UserProvider>
          </ScaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
