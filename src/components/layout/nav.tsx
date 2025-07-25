
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
  { href: '/my-profile', label: 'My Profile', icon: UserCircle },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: Bell, requiredPermissions: ['Alerts:View'] },
  { href: '/bookings', label: 'Bookings', icon: Calendar, requiredPermissions: ['Bookings:View', 'Bookings:Edit'] },
  { href: '/aircraft', label: 'Aircraft', icon: Plane, requiredPermissions: ['Aircraft:View', 'Aircraft:Edit'] },
  { href: '/students', label: 'Students', icon: Users, requiredPermissions: ['Students:View', 'Students:Edit'] },
  { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredPermissions: ['Personnel:View', 'Personnel:Edit'] },
  { href: '/checklists/scan', label: 'Scan Checklist', icon: QrCode },
  { href: '/safety', label: 'Safety', icon: Shield, requiredPermissions: ['Safety:View', 'Safety:Edit'] },
  { href: '/quality', label: 'Quality', icon: CheckSquare, requiredPermissions: ['Quality:View', 'Quality:Edit'] },
  { href: '/reports', label: 'Flight Statistics', icon: AreaChart, requiredPermissions: ['Reports:View'], requiredFeature: 'AdvancedAnalytics' },
];

const settingsNavItems = [
    { href: '/settings/operational', label: 'Operational Settings', icon: Cog, requiredPermissions: ['Settings:Edit'] },
    { href: '/settings/companies', label: 'Companies', icon: Building, requiredPermissions: ['Super User'] },
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
    if (!requiredFeature) {
        return true; // No specific feature required
    }
    return companyFeatures.includes(requiredFeature);
  };

  if (!user) {
    return null; // Don't render nav if not logged in
  }

  const visibleNavItems = navItems.filter(item => hasPermission(item.requiredPermissions) && hasFeature(item.requiredFeature));
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
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
                  onClick={handleLinkClick}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            {visibleSettingsItems.map((item) => (
                 <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref>
                        <SidebarMenuButton tooltip={{ children: item.label }} isActive={pathname === item.href} onClick={handleLinkClick}>
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'Support' }}>
                    <HelpCircle />
                    <span>Support</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
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

    