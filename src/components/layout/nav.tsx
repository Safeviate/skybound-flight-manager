
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
} from 'lucide-react';
import type { Permission } from '@/lib/types';
import { useUser } from '@/context/user-provider';


const navItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
}[] = [
  { href: '/my-profile', label: 'My Profile', icon: UserCircle },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alerts', icon: Bell, requiredPermissions: ['Alerts:View'] },
  { href: '/bookings', label: 'Bookings', icon: Calendar, requiredPermissions: ['Bookings:View', 'Bookings:Edit'] },
  { href: '/aircraft', label: 'Aircraft', icon: Plane, requiredPermissions: ['Aircraft:View', 'Aircraft:Edit'] },
  { href: '/students', label: 'Students', icon: Users, requiredPermissions: ['Students:View', 'Students:Edit'] },
  { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredPermissions: ['Personnel:View', 'Personnel:Edit'] },
  { href: '/checklists', label: 'Checklist Templates', icon: ClipboardCheck, requiredPermissions: ['Checklists:View', 'Checklists:Edit'] },
  { href: '/safety', label: 'Safety', icon: Shield, requiredPermissions: ['Safety:View', 'Safety:Edit'] },
  { href: '/quality', label: 'Quality', icon: CheckSquare, requiredPermissions: ['Quality:View', 'Quality:Edit'] },
  { href: '/reports', label: 'Flight Statistics', icon: AreaChart, requiredPermissions: ['Reports:View'] },
];

export default function Nav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user, logout } = useUser();
  const router = useRouter();
  const userPermissions = user?.permissions || [];

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

  const visibleNavItems = navItems.filter(item => hasPermission(item.requiredPermissions));

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-lg font-semibold text-sidebar-foreground">SkyBound</span>
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
            <SidebarMenuItem>
              <Link href="/settings" passHref>
                <SidebarMenuButton tooltip={{ children: 'Settings' }} isActive={pathname === '/settings'} onClick={handleLinkClick}>
                    <Settings />
                    <span>Settings</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
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
