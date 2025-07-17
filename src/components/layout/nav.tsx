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
  HelpCircle
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bookings', label: 'Bookings', icon: Calendar },
  { href: '/aircraft', label: 'Aircraft', icon: Plane },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/personnel', label: 'Personnel', icon: UserCheck },
  { href: '/safety', label: 'Safety', icon: Shield },
];

export default function Nav() {
  const pathname = usePathname();

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
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
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
