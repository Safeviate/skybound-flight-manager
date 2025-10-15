'use client';

import { UserProvider } from '@/context/user-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { ScaleProvider } from '@/context/scale-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppContent } from './app-content';
import { Toaster } from '@/components/ui/toaster';

export function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <SettingsProvider>
              <ScaleProvider>
                <SidebarProvider>
                  <AppContent>
                    {children}
                  </AppContent>
                  <Toaster />
                </SidebarProvider>
              </ScaleProvider>
            </SettingsProvider>
        </UserProvider>
    );
}
