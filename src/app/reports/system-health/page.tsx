
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, where, getCountFromServer, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Company, SafetyReport, Booking } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { subDays, formatDistanceToNow } from 'date-fns';
import { BellOff, AlertTriangle, Activity, Loader2 } from 'lucide-react';

interface CompanyWithStats extends Company {
  openSafetyReports: number;
  lastBookingDate?: Timestamp;
}

const SystemHealthCard = ({ companies }: { companies: CompanyWithStats[] }) => {
  const [healthAlerts, setHealthAlerts] = useState<
    { level: 'warning' | 'info'; message: string; companyName: string }[]
  >([]);

  useEffect(() => {
    const alerts = [];
    const thirtyDaysAgo = subDays(new Date(), 30);

    for (const company of companies) {
      if (company.openSafetyReports > 5) {
        alerts.push({
          level: 'warning' as const,
          message: `has ${company.openSafetyReports} open safety reports, which is higher than average.`,
          companyName: company.name,
        });
      }

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
          <CardTitle>System Health Status</CardTitle>
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


function SystemHealthPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatsForCompany = async (companyId: string): Promise<Pick<CompanyWithStats, 'openSafetyReports' | 'lastBookingDate'>> => {
    try {
      const safetyReportsRef = collection(db, `companies/${companyId}/safety-reports`);
      const openSafetyReportsQuery = query(safetyReportsRef, where('status', '!=', 'Closed'));
      
      const bookingsRef = collection(db, `companies/${companyId}/bookings`);
      const lastBookingQuery = query(bookingsRef, orderBy('date', 'desc'), limit(1));

      const [openReportsSnapshot, lastBookingSnapshot] = await Promise.all([
        getCountFromServer(openSafetyReportsQuery),
        getDocs(lastBookingQuery),
      ]);
      
      const lastBookingDate = lastBookingSnapshot.empty ? undefined : lastBookingSnapshot.docs[0].data().date;

      return {
        openSafetyReports: openReportsSnapshot.data().count,
        lastBookingDate: lastBookingDate ? Timestamp.fromDate(new Date(lastBookingDate)) : undefined,
      };
    } catch (e) {
      console.error(`Failed to fetch stats for company ${companyId}`, e);
      return { openSafetyReports: 0 };
    }
  };

  const fetchCompanies = async () => {
    setIsDataLoading(true);
    try {
      const companiesCol = collection(db, 'companies');
      const companySnapshot = await getDocs(companiesCol);
      const companyList = companySnapshot.docs.map(doc => doc.data() as Company);
      
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


  if (loading || isDataLoading || !user || !user.permissions.includes('Super User')) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading system health data...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
        <SystemHealthCard companies={companies} />
    </main>
  );
}

SystemHealthPage.title = "System Health Report";
export default SystemHealthPage;
