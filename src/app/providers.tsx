'use client';

import { UserProvider } from '@/context/user-provider';
import { SettingsProvider } from '@/context/settings-provider';
import { ScaleProvider } from '@/context/scale-provider';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <UserProvider>
            <SettingsProvider>
              <ScaleProvider>
                <SidebarProvider>
                  {children}
                </SidebarProvider>
              </ScaleProvider>
            </SettingsProvider>
        </UserProvider>
    );
}
