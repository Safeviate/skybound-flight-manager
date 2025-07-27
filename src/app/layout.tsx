
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { DynamicThemeApplicator } from '@/components/dynamic-theme-applicator';
import { AppContent } from './app-content';
import { Inter } from 'next/font/google';

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
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <SettingsProvider>
              <DynamicThemeApplicator />
              <AppContent>
                {children}
              </AppContent>
              <Toaster />
            </SettingsProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
