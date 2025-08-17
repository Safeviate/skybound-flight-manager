
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
  Bell,
  AreaChart,
  Cog,
  QrCode,
  Building,
  Database,
  ListChecks,
  Activity,
  Mail,
  PlusCircle,
  Contact,
  BookOpen,
  FlaskConical,
  BarChart,
} from 'lucide-react';
import type { Permission, Feature, NavMenuItem } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';


export const navItems: {
  href: string;
  label: NavMenuItem;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
  requiredFeature?: Feature;
}[] = [
  { href: '/my-dashboard', label: 'My Dashboard', icon: UserCircle },
  { href: '/dashboard', label: 'Company Dashboard', icon: LayoutDashboard, requiredPermissions: ['Super User'] },
  { href: '/aircraft', label: 'Aircraft Management', icon: Plane, requiredPermissions: ['Aircraft:View'], requiredFeature: 'Aircraft' },
  { href: '/alerts', label: 'Alerts', icon: Bell, requiredPermissions: ['Alerts:View'] },
  { href: '/students', label: 'Students', icon: Users, requiredPermissions: ['Students:View', 'Students:Edit'], requiredFeature: 'Students' },
  { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredPermissions: ['Personnel:View', 'Personnel:Edit'], requiredFeature: 'Personnel' },
  { href: '/training-schedule', label: 'Training Schedule', icon: Calendar, requiredPermissions: ['Students:View'], requiredFeature: 'Students' },
  { href: '/reports', label: 'Flight Statistics', icon: AreaChart, requiredPermissions: ['Reports:View'], requiredFeature: 'AdvancedAnalytics' },
  { href: '/safety', label: 'Safety', icon: Shield, requiredPermissions: ['Safety:View', 'Safety:Edit'], requiredFeature: 'Safety' },
  { href: '/quality', label: 'Quality', icon: CheckSquare, requiredPermissions: ['Quality:View', 'Quality:Edit'], requiredFeature: 'Quality' },
  { href: '/settings/contacts', label: 'External Contacts', icon: Contact, requiredPermissions: ['Settings:Edit'] },
  { href: '/settings', label: 'Appearance', icon: Settings },
  { href: '/settings/company', label: 'Company Settings', icon: Cog, requiredPermissions: ['Super User'] },
];

export const adminNavItems = [
    { href: '/settings/companies', label: 'Manage Companies', icon: Building, requiredPermissions: ['Super User'] },
    { href: '/reports/system-health', label: 'System Health', icon: Activity, requiredPermissions: ['Super User'] },
    { href: '/settings/seed-data', label: 'Seed Data', icon: Database, requiredPermissions: ['Super User'] },
    { href: '/functions', label: 'Functions', icon: FlaskConical, requiredPermissions: ['Super User'] },
    { href: '/gantt-chart', label: 'Gantt Chart', icon: BarChart, requiredPermissions: ['Super User'] },
]

const settingsNavItems: {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
  requiredFeature?: Feature;
}[] = [
    // items moved to main nav or admin nav
];

export default function Nav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { user, company, logout } = useUser();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLinkClick = () => {
    setOpenMobile(false);
  };
  
  const isMenuItemVisible = (item: { requiredPermissions?: Permission[] }) => {
    // This function now only checks for Super User permission for admin items.
    // Regular items will not have this check applied in the main menu rendering.
    if (item.requiredPermissions?.includes('Super User')) {
        return user?.permissions.includes('Super User');
    }
    return true; // All other items are visible by default now.
  }

  const getIsActive = (href: string) => {
    if (href === '/' || href === '/settings') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  };


  if (!user) {
    return null; // Don't render nav if not logged in
  }

  // Filter admin items based on Super User role
  const visibleAdminItems = adminNavItems.filter(item => 
      item.requiredPermissions?.includes('Super User') 
          ? user?.permissions.includes('Super User')
          : true
  );

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
            {company?.logoUrl ? (
                <Image src={company.logoUrl} alt={`${company.name} Logo`} width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
            ) : (
                <Rocket className="h-8 w-8 text-primary flex-shrink-0" />
            )}
            <div>
                <span className="text-lg font-semibold text-sidebar-foreground">{company?.name || 'SkyBound'}</span>
                <p className="text-xs text-sidebar-foreground/70">Flight Manager</p>
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
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
          {!isMobile && visibleAdminItems.length > 0 && (
            <SidebarMenuItem>
                <div className="px-3 pt-2 pb-1 text-xs font-semibold text-sidebar-foreground/70">Webapp Administration</div>
                {visibleAdminItems.map((item) => (
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
            {settingsNavItems.map((item) => (
                 <SidebarMenuItem key={item.href}>
                    <Link href={item.href} passHref>
                        <SidebarMenuButton tooltip={{ children: item.label }} isActive={getIsActive(item.href)} onClick={handleLinkClick}>
                            <item.icon />
                            <span>{item.label}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            ))}
         </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
