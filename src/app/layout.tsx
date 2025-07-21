
import type {Metadata} from 'next';
import './globals.css';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Nav from '@/components/layout/nav';
import { Toaster } from '@/components/ui/toaster';
import { UserProvider } from '@/context/user-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/context/settings-provider';


export const metadata: Metadata = {
  title: 'SkyBound Flight Manager',
  description: 'Flight school management system',
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
              <SidebarProvider>
                  <Sidebar>
                      <Nav />
                  </Sidebar>
                  <SidebarInset>
                      {children}
                  </SidebarInset>
              </SidebarProvider>
              <Toaster />
            </SettingsProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
