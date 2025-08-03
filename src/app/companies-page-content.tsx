
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building, Rocket, PlusCircle, Edit, MoreHorizontal, Users, Plane, ShieldAlert, User, AlertTriangle, Activity, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import type { Company } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { EditCompanyForm } from '@/app/settings/companies/edit-company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { subDays, formatDistanceToNow, parseISO } from 'date-fns';
import Loading from './loading';

interface CompanyWithStats extends Company {
  userCount: number;
  aircraftCount: number;
  openSafetyReports: number;
  lastBookingDate?: string;
}

const mockCompanies: CompanyWithStats[] = [
    {
        id: 'skybound-aero',
        name: 'SkyBound Aero',
        trademark: 'Excellence in Aviation',
        enabledFeatures: ['Safety', 'Quality', 'Aircraft', 'Students', 'Personnel', 'Bookings', 'AdvancedAnalytics'],
        userCount: 15,
        aircraftCount: 5,
        openSafetyReports: 2,
        lastBookingDate: subDays(new Date(), 5).toISOString(),
    },
    {
        id: 'summit-flights',
        name: 'Summit Flights',
        trademark: 'Reach New Heights',
        enabledFeatures: ['Safety', 'Bookings', 'Aircraft'],
        userCount: 8,
        aircraftCount: 3,
        openSafetyReports: 0,
        lastBookingDate: subDays(new Date(), 40).toISOString(),
    }
];

const SystemHealth = ({ companies }: { companies: CompanyWithStats[] }) => {
  const [healthAlerts, setHealthAlerts] = useState<
    { level: 'warning' | 'info'; message: string; companyName: string }[]
  >([]);

  useEffect(() => {
    const alerts = [];
    const thirtyDaysAgo = subDays(new Date(), 30);

    for (const company of companies) {
      // Alert for high number of open safety reports
      if (company.openSafetyReports > 5) {
        alerts.push({
          level: 'warning' as const,
          message: `has ${company.openSafetyReports} open safety reports, which is higher than average.`,
          companyName: company.name,
        });
      }

      // Alert for inactivity
      if (company.lastBookingDate && parseISO(company.lastBookingDate) < thirtyDaysAgo) {
        alerts.push({
          level: 'info' as const,
          message: `has had no new bookings in over 30 days. Last booking was ${formatDistanceToNow(parseISO(company.lastBookingDate), { addSuffix: true })}.`,
          companyName: company.name,
        });
      }
    }
    setHealthAlerts(alerts);
  }, [companies]);

  if (healthAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>Automated checks for operational issues across all companies.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
            <div className="flex items-center gap-2 text-muted-foreground">
                <BellOff className="h-5 w-5" />
                <p>No system health alerts at this time.</p>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle />
            System Health Alerts
        </CardTitle>
        <CardDescription>
            The following potential issues require your attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
            {healthAlerts.map((alert, index) => (
                <li key={index} className="flex items-start gap-3">
                    <Activity className={`h-4 w-4 mt-1 ${alert.level === 'warning' ? 'text-destructive' : 'text-primary'}`} />
                    <p className="text-sm">
                        <span className="font-semibold">{alert.companyName}</span> {alert.message}
                    </p>
                </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export function CompaniesPageContent({ initialCompanies }: { initialCompanies: CompanyWithStats[] }) {
  const { user, loading, setCompany: setGlobalCompany } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithStats[]>(mockCompanies);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const { toast } = useToast();

  const handleNewCompany = () => {
    toast({ title: "Company Registered", description: `This is a mock action.` });
    setIsNewDialogOpen(false);
  };

  const handleEditCompany = () => {
    if (!editingCompany) return;
    toast({ title: 'Company Updated', description: `${editingCompany.name} has been updated.`});
    setIsEditDialogOpen(false);
    setEditingCompany(null);
  };
  
  const handleLoginAs = (company: CompanyWithStats) => {
    toast({
        title: `Switching to ${company.name}`,
        description: `This would log you in as an admin for this company.`,
    });
    setGlobalCompany(company);
    router.push('/my-dashboard');
  }

  const openEditDialog = (company: Company) => {
    setEditingCompany(company);
    setIsEditDialogOpen(true);
  }

  const totalUsers = companies.reduce((sum, c) => sum + c.userCount, 0);
  const totalAircraft = companies.reduce((sum, c) => sum + c.aircraftCount, 0);
  const totalOpenReports = companies.reduce((sum, c) => sum + c.openSafetyReports, 0);

  if (loading) {
    return <Loading />;
  }
  
  if (!user || !user.permissions.includes('Super User')) {
      return (
        <main className="flex-1 flex items-center justify-center">
            <p>You do not have permission to view this page.</p>
        </main>
      );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{companies.length}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalUsers}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Aircraft</CardTitle>
                    <Plane className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalAircraft}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Safety Reports</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalOpenReports}</div>
                </CardContent>
            </Card>
        </div>
        <SystemHealth companies={companies} />
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Registered Companies</CardTitle>
                <CardDescription>
                A list of all organizations registered in the system.
                </CardDescription>
            </div>
            <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Company
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Register New Company</DialogTitle>
                        <DialogDescription>
                            Set up a new portal for an organization.
                        </DialogDescription>
                    </DialogHeader>
                    {/* The form now has a simplified onSubmit */}
                    <NewCompanyForm onSubmit={() => handleNewCompany()} />
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Open Reports</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companies.map((company) => (
                <TableRow key={company.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                        {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-6 w-6 object-contain"/> : <Rocket className="h-5 w-5 text-primary" />}
                        {company.name}
                    </TableCell>
                    <TableCell>{company.userCount}</TableCell>
                    <TableCell>{company.aircraftCount}</TableCell>
                    <TableCell>
                        <Badge variant={company.openSafetyReports > 0 ? 'destructive' : 'success'}>
                            {company.openSafetyReports}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onSelect={() => handleLoginAs(company)}>
                                    <User className="mr-2 h-4 w-4"/>
                                    Login As Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openEditDialog(company)}>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Edit Company
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </CardContent>
        </Card>

        {editingCompany && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Company: {editingCompany.name}</DialogTitle>
                        <DialogDescription>
                        Update the details for this organization.
                        </DialogDescription>
                    </DialogHeader>
                    {/* The form now has a simplified onSubmit */}
                    <EditCompanyForm company={editingCompany} onSubmit={() => handleEditCompany()} />
                </DialogContent>
            </Dialog>
        )}
    </main>
  );
}
