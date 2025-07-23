
'use client';

import { usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Nav from '@/components/layout/nav';
import Footer from '@/components/layout/footer';
import { useUser } from '@/context/user-provider';

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  
  const noLayoutRoutes = ['/login', '/corporate'];
  const showLayout = user && !noLayoutRoutes.includes(pathname);

  if (showLayout) {
    return (
      <SidebarProvider>
          <Sidebar>
              <Nav />
          </Sidebar>
          <SidebarInset>
              <div className="flex-1 flex flex-col">
                {children}
              </div>
              <Footer />
          </SidebarInset>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
