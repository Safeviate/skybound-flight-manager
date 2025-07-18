
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
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
} from 'lucide-react';
import type { Permission } from '@/lib/types';
import { personnelData } from '@/lib/mock-data';

// In a real app, this would come from an auth context/session
const LOGGED_IN_USER_ID = '5';

const navItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
}[] = [
  { href: '/my-profile', label: 'My Profile', icon: UserCircle },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: Calendar, requiredPermissions: ['Flight Manager'] },
  { href: '/aircraft', label: 'Aircraft', icon: Plane, requiredPermissions: ['Fleet Manager'] },
  { href: '/students', label: 'Students', icon: Users, requiredPermissions: ['Flight Manager'] },
  { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredPermissions: ['User Manager'] },
  { href: '/safety', label: 'Safety', icon: Shield, requiredPermissions: ['Safety Manager'] },
  { href: '/quality', label: 'Quality', icon: CheckSquare, requiredPermissions: ['Quality Manager'] },
];

export default function Nav() {
  const pathname = usePathname();
  const user = personnelData.find(p => p.id === LOGGED_IN_USER_ID);
  const userPermissions = user?.permissions || [];

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
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  as="a"
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label }}
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
                <SidebarMenuButton tooltip={{ children: 'Settings' }}>
                    <Settings />
                    <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton tooltip={{ children: 'Support' }}>
                    <HelpCircle />
                    <span>Support</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
