

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Plane,
  Users,
  UserCheck,
  Calendar,
  Shield,
  Rocket,
  Settings,
  HelpCircle,
  UserCircle,
  CheckSquare,
  ClipboardCheck,
  LogOut,
  Bell,
  AreaChart,
  Cog,
  QrCode,
  Building,
  Database,
  ListChecks,
  Activity,
  Mail,
} from 'lucide-react';
import type { Permission, Feature } from '@/lib/types';
import { useUser } from '@/context/user-provider';


const navItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
  requiredFeature?: Feature;
}[] = [
  { href: '/', label: 'Companies', icon: Building, requiredPermissions: ['Super User'] },
  { href: '/my-dashboard', label: 'My Dashboard', icon: UserCircle },
  { href: '/messages', label: 'Messages', icon: Mail },
  { href: '/alerts', label: 'Alerts', icon: Bell, requiredPermissions: ['Alerts:View'] },
  { href: '/bookings', label: 'Bookings', icon: Calendar, requiredPermissions: ['Bookings:View', 'Bookings:Edit'], requiredFeature: 'Bookings' },
  { href: '/aircraft', label: 'Aircraft', icon: Plane, requiredPermissions: ['Aircraft:View', 'Aircraft:Edit'], requiredFeature: 'Aircraft' },
  { href: '/students', label: 'Students', icon: Users, requiredPermissions: ['Students:View', 'Students:Edit'], requiredFeature: 'Students' },
  { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredPermissions: ['Personnel:View', 'Personnel:Edit'], requiredFeature: 'Personnel' },
  { href: '/safety', label: 'Safety', icon: Shield, requiredPermissions: ['Safety:View', 'Safety:Edit'], requiredFeature: 'Safety' },
  { href: '/quality', label: 'Quality', icon: CheckSquare, requiredPermissions: ['Quality:View', 'Quality:Edit'], requiredFeature: 'Quality' },
];

const reportsNavItems = [
    { href: '/reports', label: 'Flight Statistics', icon: AreaChart, requiredPermissions: ['Reports:View'], requiredFeature: 'AdvancedAnalytics' },
    { href: '/reports/system-health', label: 'System Health', icon: Activity, requiredPermissions: ['Super User'] },
]

const settingsNavItems = [
    { href: '/settings/operational', label: 'Operational Settings', icon: Cog, requiredPermissions: ['Settings:Edit'] },
    { href: '/settings', label: 'Appearance', icon: Settings },
];

export default function Nav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user, company, logout } = useUser();
  const router = useRouter();
  const userPermissions = user?.permissions || [];
  const companyFeatures = company?.enabledFeatures || [];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  const hasPermission = (requiredPermissions?: Permission[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // Public link
    }
    if (userPermissions.includes('Super User')) {
      return true; // Super User sees everything
    }
    return requiredPermissions.some(p => userPermissions.includes(p));
  };
  
  const hasFeature = (requiredFeature?: Feature) => {
    if (user?.permissions.includes('Super User')) {
        return true; // Super User bypasses feature flags
    }
    if (!requiredFeature) {
        return true; // No specific feature required
    }
    return companyFeatures.includes(requiredFeature);
  };
  
  const getIsActive = (href: string) => {
    if (href === '/') {
        return pathname === '/';
    }
    return pathname.startsWith(href);
  };


  if (!user) {
    return null; // Don't render nav if not logged in
  }

  const visibleNavItems = navItems.filter(item => {
    if (item.href === '/my-dashboard' && user.permissions.includes('Super User')) {
      return true;
    }
    if (item.href === '/' && !user.permissions.includes('Super User')) {
      return false;
    }
    return hasPermission(item.requiredPermissions) && hasFeature(item.requiredFeature)
  });
  
  const visibleReportsItems = reportsNavItems.filter(item => hasPermission(item.requiredPermissions) && hasFeature(item.requiredFeature));
  const visibleSettingsItems = settingsNavItems.filter(item => hasPermission(item.requiredPermissions));

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
            <Rocket className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
                <span className="text-lg font-semibold text-sidebar-foreground">{company?.name || 'SkyBound'}</span>
                <p className="text-xs text-sidebar-foreground/70">Flight Manager</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  as="a"
                  isActive={getIsActive(item.href)}
                  tooltip={{ children: item.label }}
                  onClick={handleLinkClick}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          {visibleReportsItems.length > 0 && (
            <SidebarMenuItem>
                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-sidebar-foreground/70">Reports</div>
                {visibleReportsItems.map((item) => (
                     <Link key={item.href} href={item.href} passHref>
                        <SidebarMenuButton
                            as="a"
                            isActive={getIsActive(item.href)}
                            tooltip={{ children: item.label }}
                            onClick={handleLinkClick}
                            className="ml-2"
                        >
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                ))}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            {visibleSettingsItems.map((item) => (
                 <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref>
                        <SidebarMenuButton tooltip={{ children: item.label }} isActive={getIsActive(item.href)} onClick={handleLinkClick}>
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={{ children: 'Logout' }}>
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
