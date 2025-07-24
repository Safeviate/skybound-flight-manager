
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { DynamicThemeApplicator } from '@/components/dynamic-theme-applicator';
import { AppContent } from './app-content';


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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
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
