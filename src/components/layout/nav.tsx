
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
} from 'lucide-react';
import type { Permission, Feature } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useIsMobile } from '@/hooks/use-mobile';


const navItems: {
  href: string;
  label: string;
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

const adminNavItems = [
    { href: '/settings/companies', label: 'Manage Companies', icon: Building, requiredPermissions: ['Super User'] },
    { href: '/reports/system-health', label: 'System Health', icon: Activity, requiredPermissions: ['Super User'] },
    { href: '/settings/seed-data', label: 'Seed Data', icon: Database, requiredPermissions: ['Super User'] },
    { href: '/functions', label: 'Functions', icon: FlaskConical, requiredPermissions: ['Super User'] },
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
    if (href === '/' || href === '/settings') {
        return pathname === href;
    }
    return pathname.startsWith(href);
  };


  if (!user) {
    return null; // Don't render nav if not logged in
  }

  const itemsToDisplay = navItems;

  const visibleNavItems = itemsToDisplay.filter(item => {
    if (item.href === '/my-dashboard' && user.permissions.includes('Super User')) {
      return true;
    }
    if (item.href === '/' && !user.permissions.includes('Super User')) {
      return false;
    }
    if (item.href === '/my-dashboard' && !user.permissions.includes('Super User')) {
        return true;
    }
    return hasPermission(item.requiredPermissions) && hasFeature(item.requiredFeature)
  });
  
  const visibleAdminItems = adminNavItems.filter(item => hasPermission(item.requiredPermissions) && hasFeature(item.requiredFeature));
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
            {!isMobile && visibleSettingsItems.map((item) => (
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
