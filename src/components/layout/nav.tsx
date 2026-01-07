
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
  SidebarMenuSub,
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
  Network,
  Map,
  FileQuestion,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import type { Permission, Feature, NavMenuItem } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';


export const navItems: {
  href?: string;
  label: NavMenuItem;
  icon: React.ElementType;
  requiredPermissions?: Permission[];
  requiredFeature?: Feature;
  subItems?: {
    href: string;
    label: NavMenuItem;
    icon: React.ElementType;
    requiredPermissions?: Permission[];
    requiredFeature?: Feature;
  }[];
}[] = [
  { href: '/my-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
  { href: '/personnel/me', label: 'My Profile', icon: UserCircle },
  { href: '/dashboard', label: 'Company Dashboard', icon: LayoutDashboard },
  {
    label: 'Operations',
    icon: Rocket,
    subItems: [
        { href: '/training-schedule', label: 'Training Schedule', icon: Calendar, requiredFeature: 'Bookings' },
        { href: '/meetings', label: 'Meetings', icon: Users, requiredFeature: 'Bookings' },
        { href: '/flight-logs', label: 'Flight Logs', icon: BookOpen },
        { href: '/reports', label: 'Flight Statistics', icon: AreaChart, requiredFeature: 'AdvancedAnalytics' },
        { href: '/alerts', label: 'Alerts', icon: Bell, requiredPermissions: ['Alerts:View'] },
        { href: '/quick-reports', label: 'Quick Reports', icon: ClipboardCheck },
    ]
  },
  {
      label: 'Training',
      icon: BookOpen,
      subItems: [
        { href: '/students', label: 'Students', icon: Users, requiredFeature: 'Students' },
        { href: '/exams', label: 'Exams', icon: FileQuestion, requiredPermissions: ['Exams:View'] },
      ]
  },
  {
    label: 'Safety',
    icon: Shield,
    requiredFeature: 'Safety',
    subItems: [
      { href: '/safety?tab=dashboard', label: 'Safety Dashboard', icon: LayoutDashboard },
      { href: '/safety?tab=reports', label: 'Safety Reports', icon: ShieldAlert },
      { href: '/safety?tab=register', label: 'Risk Register', icon: ListChecks },
      { href: '/safety?tab=spis', label: 'SPIs', icon: TrendingUp },
      { href: '/safety?tab=moc', label: 'MOC', icon: Network },
    ],
  },
  {
    label: 'Quality',
    icon: CheckSquare,
    requiredFeature: 'Quality',
    subItems: [
      { href: '/quality?tab=dashboard', label: 'Quality Dashboard', icon: LayoutDashboard },
      { href: '/quality?tab=audits', label: 'Audits', icon: ClipboardCheck },
      { href: '/quality?tab=checklists', label: 'Audit Checklists', icon: ListChecks },
      { href: '/quality?tab=coherence-matrix', label: 'Coherence Matrix', icon: Network },
      { href: '/task-tracker', label: 'Task Tracker', icon: ListChecks },
    ],
  },
  {
      label: 'Assets',
      icon: Building,
      subItems: [
          { href: '/aircraft', label: 'Aircraft Management', icon: Plane, requiredFeature: 'Aircraft' },
      ]
  },
  {
    label: 'Administration',
    icon: Cog,
    subItems: [
        { href: '/personnel', label: 'Personnel', icon: UserCheck, requiredFeature: 'Personnel' },
        { href: '/hire-and-fly', label: 'Hire and Fly', icon: Contact, requiredFeature: 'Personnel' },
    ]
  },
  { href: '/settings/contacts', label: 'External Contacts', icon: Contact, requiredPermissions: ['Settings:Edit'] },
  { href: '/settings', label: 'Appearance', icon: Settings },
  { href: '/settings/company', label: 'Company Settings', icon: Cog },
  { href: '/settings/roles', label: 'Roles & Departments', icon: Network, requiredPermissions: ['Roles & Departments:View'] },
];

export const adminNavItems = [
    { href: '/settings/companies', label: 'Manage Companies', icon: Building },
    { href: '/reports/system-health', label: 'System Health', icon: Activity },
    { href: '/functions', label: 'Functions', icon: FlaskConical },
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
  
  const isMenuItemVisible = (item: { label: NavMenuItem, requiredPermissions?: Permission[], subItems?: any[] }) => {
    if (!user) return false;
    
    if (user.permissions?.includes('Super User')) {
      return true;
    }
    
    // Check against the user's specific visibleMenuItems array
    if (user.visibleMenuItems && !user.visibleMenuItems.includes(item.label)) {
        return false;
    }

    // If it's a parent menu, show it if any of its children are visible
    if (item.subItems) {
        return item.subItems.some(subItem => isMenuItemVisible(subItem));
    }

    // If no specific permissions are required, show the item
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
        return true;
    }
    // Check if user has at least one of the required permissions
    return item.requiredPermissions.some(p => user.permissions.includes(p));
  }

  const getIsActive = (href?: string, subItems?: any[]) => {
    if (!href && subItems) {
        return subItems.some(item => pathname.startsWith(item.href));
    }
    if (href === '/my-dashboard' || href === '/dashboard') {
        return pathname === href;
    }
    if (href) {
        return pathname.startsWith(href);
    }
    return false;
  };

  if (!user) {
    return null; // Don't render nav if not logged in
  }

  // Filter main and admin items based on visibility rules
  const visibleNavItems = navItems.filter(isMenuItemVisible);
  const visibleAdminItems = adminNavItems.filter(isMenuItemVisible);
  const showAdminMenu = user.permissions?.includes('Super User');


  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-center p-4">
            {company?.logoUrl ? (
                <Image src={company.logoUrl} alt={`${company.name} Logo`} width={120} height={120} className="h-auto w-[120px] rounded-md object-contain" />
            ) : (
                <Rocket className="h-20 w-20 text-primary flex-shrink-0" />
            )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visibleNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
             {item.href ? (
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
             ) : (
                <SidebarMenuButton
                    isSubmenu
                    isActive={getIsActive(undefined, item.subItems)}
                    tooltip={{ children: item.label }}
                    >
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
             )}
            {item.subItems && (
                <SidebarMenuSub>
                    {item.subItems.filter(isMenuItemVisible).map(subItem => (
                        <SidebarMenuItem key={subItem.href}>
                             <Link href={subItem.href} passHref>
                                <SidebarMenuButton
                                    as="a"
                                    isActive={getIsActive(subItem.href)}
                                    size="sm"
                                    tooltip={{ children: subItem.label }}
                                    onClick={handleLinkClick}
                                >
                                <subItem.icon />
                                <span>{subItem.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenuSub>
            )}
            </SidebarMenuItem>
          ))}
          {!isMobile && showAdminMenu && (
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
