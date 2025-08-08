
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building, Globe, Paintbrush, Rocket, PlusCircle, Edit, MoreHorizontal, Users, Plane, ShieldAlert, User, Loader2, AlertTriangle, Activity, BellOff, GitPullRequest } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import type { Company, User as CompanyUser, SafetyReport, Feature } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, collection, getDocs, updateDoc, query, where, getCountFromServer, Timestamp, limit, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import config from '@/config';
import { EditCompanyForm } from '@/app/settings/companies/edit-company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { subDays, formatDistanceToNow } from 'date-fns';

interface CompanyWithStats extends Company {
  userCount: number;
  aircraftCount: number;
  openSafetyReports: number;
  lastBookingDate?: Timestamp;
}

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
      if (company.lastBookingDate && company.lastBookingDate.toDate() < thirtyDaysAgo) {
        alerts.push({
          level: 'info' as const,
          message: `has had no new bookings in over 30 days. Last booking was ${formatDistanceToNow(company.lastBookingDate.toDate(), { addSuffix: true })}.`,
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

function CompaniesPage() {
  const { user, loading, setCompany: setGlobalCompany, updateCompany } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatsForCompany = async (companyId: string): Promise<Omit<CompanyWithStats, keyof Company>> => {
    try {
      const usersRef = collection(db, `companies/${companyId}/users`);
      const aircraftRef = collection(db, `companies/${companyId}/aircraft`);
      const safetyReportsRef = collection(db, `companies/${companyId}/safety-reports`);
      const openSafetyReportsQuery = query(safetyReportsRef, where('status', '!=', 'Closed'));
      
      const bookingsRef = collection(db, `companies/${companyId}/bookings`);
      const lastBookingQuery = query(bookingsRef, orderBy('date', 'desc'), limit(1));

      const [userSnapshot, aircraftSnapshot, openReportsSnapshot, lastBookingSnapshot] = await Promise.all([
        getCountFromServer(usersRef),
        getCountFromServer(aircraftRef),
        getCountFromServer(openSafetyReportsQuery),
        getDocs(lastBookingQuery),
      ]);
      
      const lastBookingDate = lastBookingSnapshot.empty ? undefined : lastBookingSnapshot.docs[0].data().date;

      return {
        userCount: userSnapshot.data().count,
        aircraftCount: aircraftSnapshot.data().count,
        openSafetyReports: openReportsSnapshot.data().count,
        lastBookingDate: lastBookingDate ? Timestamp.fromDate(new Date(lastBookingDate)) : undefined,
      };
    } catch (e) {
      console.error(`Failed to fetch stats for company ${companyId}`, e);
      return { userCount: 0, aircraftCount: 0, openSafetyReports: 0 };
    }
  };

  const fetchCompanies = async () => {
    setIsDataLoading(true);
    try {
      const companiesCol = collection(db, 'companies');
      const companySnapshot = await getDocs(companiesCol);
      const companyList = companySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      
      const companiesWithStats = await Promise.all(
        companyList.map(async (company) => {
          const stats = await fetchStatsForCompany(company.id);
          return { ...company, ...stats };
        })
      );
      
      setCompanies(companiesWithStats);
    } catch (e) {
      console.error("Error fetching companies: ", e);
      toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch company data from the database.',
      });
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || !user.permissions.includes('Super User'))) {
      router.push('/my-dashboard');
    } else if (user) {
        fetchCompanies();
    }
  }, [user, loading, router]);


  const handleNewCompany = async (newCompanyData: Omit<Company, 'id'>, adminData: Omit<CompanyUser, 'id' | 'companyId' | 'role' | 'permissions'>, password: string) => {
    const companyId = newCompanyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
        const newUserId = userCredential.user.uid;

        const companyDocRef = doc(db, 'companies', companyId);
        const finalCompanyData = { ...newCompanyData, id: companyId };
        await setDoc(companyDocRef, finalCompanyData);
        
        const userDocRef = doc(db, `companies/${companyId}/users`, newUserId);
        const finalUserData: Omit<CompanyUser, 'password'> = {
            ...adminData,
            id: newUserId,
            companyId: companyId,
            role: 'Admin',
            permissions: ROLE_PERMISSIONS['Admin'],
        };
        await setDoc(userDocRef, finalUserData);

        toast({
            title: "Company Registered Successfully!",
            description: `The company "${newCompanyData.name}" has been created.`
        });
        
        setCompanies(prev => [...prev, { ...finalCompanyData, userCount: 1, aircraftCount: 0, openSafetyReports: 0 }]);
        setIsNewDialogOpen(false);

    } catch (error: any) {
        console.error("Error creating company:", error);
        const errorCode = error.code;
        let errorMessage = "An unknown error occurred.";
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (errorCode === 'auth/weak-password') {
            errorMessage = "The password is too weak. Please use at least 8 characters.";
        }
        toast({
            variant: 'destructive',
            title: "Registration Failed",
            description: errorMessage,
        });
    }
  };

  const handleEditCompany = async (updatedData: Partial<Company>, logoFile?: File) => {
    if (!editingCompany) return;

    let logoUrl = editingCompany.logoUrl;
    if (logoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(logoFile);
        await new Promise<void>((resolve, reject) => {
            reader.onload = () => {
                logoUrl = reader.result as string;
                resolve();
            };
            reader.onerror = (error) => reject(error);
        });
    }

    const finalData = { ...editingCompany, ...updatedData, logoUrl };
    
    const success = await updateCompany(finalData);

    if (success) {
      setCompanies(prev => prev.map(c => c.id === editingCompany.id ? { ...c, ...finalData } : c));
      toast({
            title: 'Company Updated',
            description: `${editingCompany.name} has been updated.`,
      });
      setIsEditDialogOpen(false);
      setEditingCompany(null);
    } else {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not save company updates.'});
    }
  };
  
  const handleLoginAs = (company: CompanyWithStats) => {
    toast({
        title: `Switching to ${company.name}`,
        description: `This would log you in as an admin for this company. (Feature not fully implemented)`,
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
  
  const projectId = db.app.options.projectId;
  const deploymentUrl = `https://console.firebase.google.com/project/${projectId}/apphosting`;


  if (loading || isDataLoading || !user || !user.permissions.includes('Super User')) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading system data...</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <SystemHealth companies={companies} />
          </div>
          <Card>
            <CardHeader>
                <CardTitle>System Management</CardTitle>
                <CardDescription>Manage deployments and rollbacks.</CardDescription>
            </CardHeader>
            <CardContent>
                <a href={deploymentUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full">
                        <GitPullRequest className="mr-2 h-4 w-4" />
                        Manage Deployments
                    </Button>
                </a>
                <p className="text-xs text-muted-foreground mt-2">
                    This will open the Firebase App Hosting console where you can view deployment history and perform rollbacks.
                </p>
            </CardContent>
          </Card>
        </div>
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
                    <NewCompanyForm onSubmit={handleNewCompany} />
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
                    <EditCompanyForm company={editingCompany} onSubmit={handleEditCompany} />
                </DialogContent>
            </Dialog>
        )}
      </main>
  );
}

CompaniesPage.title = 'Company Management';
export default CompaniesPage;

    