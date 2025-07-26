
'use client';

import { usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Nav from '@/components/layout/nav';
import Footer from '@/components/layout/footer';
import { useUser } from '@/context/user-provider';
import Header from '@/components/layout/header';
import { Children } from 'react';

// A helper to extract the title prop from page components
function getPageTitle(children: React.ReactNode): string {
    const child = Children.only(children) as React.ReactElement<any, string | React.JSXElementConstructor<any>>;
    if (child && child.props && child.props.title) {
        return child.props.title;
    }
    
    // Fallback logic for different page structures if needed
    const pageComponent = child?.props?.children?.[0]?.props?.childProp?.segment;
    if (pageComponent) {
       switch(pageComponent) {
         case 'my-profile': return 'My Profile';
         case 'dashboard': return 'Dashboard';
         // Add other cases as needed
       }
    }
    return 'Skybound';
}


export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  
  const noLayoutRoutes = ['/login', '/corporate'];
  const showLayout = user && !noLayoutRoutes.includes(pathname);
  
  const pageComponent = Children.only(children) as React.ReactElement;
  const pageTitle = (pageComponent.type as any).title || 'Skybound';
  const headerContent = (pageComponent.type as any).headerContent;


  if (showLayout) {
    return (
      <SidebarProvider>
          <Sidebar>
              <Nav />
          </Sidebar>
          <SidebarInset>
              <div className="flex-1 flex flex-col min-h-0">
                <Header title={pageTitle}>
                  {headerContent}
                </Header>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
              </div>
              <Footer />
          </SidebarInset>
      </SidebarProvider>
    );
  }

  return <>{children}</>;
}
