
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Users, Calendar, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { aircraftData, bookingData, safetyReportData, userData } from '@/lib/data-provider';

function Dashboard() {
  const { user, company, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
  }, [user, loading, router]);

  const stats = useMemo(() => {
    if (!company) return [];

    const companyAircraft = aircraftData.filter(ac => ac.companyId === company.id);
    const companyStudents = userData.filter(u => u.companyId === company.id && u.role === 'Student' && u.status === 'Active');
    const companyBookings = bookingData.filter(b => b.companyId === company.id && new Date(b.date) >= new Date());
    const companySafetyReports = safetyReportData.filter(sr => sr.companyId === company.id && sr.status !== 'Closed');

    return [
      {
        title: 'Total Aircraft',
        value: companyAircraft.length.toString(),
        icon: <Plane className="h-8 w-8 text-primary" />,
        href: '/aircraft',
      },
      {
        title: 'Active Students',
        value: companyStudents.length.toString(),
        icon: <Users className="h-8 w-8 text-primary" />,
        href: '/students',
      },
      {
        title: 'Upcoming Bookings',
        value: companyBookings.length.toString(),
        icon: <Calendar className="h-8 w-8 text-primary" />,
        href: '/bookings',
      },
      {
        title: 'Open Safety Reports',
        value: companySafetyReports.length.toString(),
        icon: <ShieldAlert className="h-8 w-8 text-destructive" />,
        href: '/safety',
      },
    ];
  }, [company]);
  
  const recentActivities = useMemo(() => {
    if (!company) return [];
    
    // This is a simplified mock. A real implementation would fetch and sort from multiple collections.
    const lastBooking = bookingData.filter(b => b.companyId === company.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastStudent = userData.filter(u => u.companyId === company.id && u.role === 'Student').sort((a,b) => (a.id > b.id ? -1 : 1))[0];
    const lastSafetyReport = safetyReportData.filter(sr => sr.companyId === company.id).sort((a,b) => new Date(b.filedDate).getTime() - new Date(a.filedDate).getTime())[0];
    const lastAircraftUpdate = aircraftData.find(ac => ac.companyId === company.id && ac.status === 'In Maintenance');

    const activities = [];
    if(lastBooking) activities.push({ type: 'New Booking', description: `${lastBooking.aircraft} for ${lastBooking.student}`, time: '10 min ago' });
    if(lastStudent) activities.push({ type: 'New Student', description: `${lastStudent.name} has been registered.`, time: '1 hour ago' });
    if(lastSafetyReport) activities.push({ type: 'Safety Report', description: `New report filed: ${lastSafetyReport.heading}`, time: '3 hours ago' });
    if(lastAircraftUpdate) activities.push({ type: 'Aircraft Update', description: `${lastAircraftUpdate.model} is in maintenance.`, time: 'Yesterday' });
    
    return activities.slice(0, 4);
    
  }, [company]);


  if (loading || !user) {
      return (
          <main className="flex items-center justify-center min-h-screen">
              <p>Loading...</p>
          </main>
      )
  }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link href={stat.href} key={stat.title}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedule</CardTitle>
            </CardHeader>
            <CardContent>
               <ul className="space-y-4">
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Calendar className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Flight Training with John D.</p>
                        <p className="text-sm text-muted-foreground">Cessna 172 | Today at 14:00</p>
                    </div>
                 </li>
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Plane className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Maintenance Check</p>
                        <p className="text-sm text-muted-foreground">Piper Arrow | Tomorrow at 09:00</p>
                    </div>
                 </li>
                 <li className="flex items-center space-x-4">
                    <div className="p-2 bg-accent/20 rounded-lg"><Calendar className="h-5 w-5 text-accent-foreground"/></div>
                    <div>
                        <p className="font-medium">Solo Flight - Jane S.</p>
                        <p className="text-sm text-muted-foreground">Diamond DA40 | Tomorrow at 11:00</p>
                    </div>
                 </li>
               </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <li key={index}>
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
  );
}

Dashboard.title = 'Dashboard';
export default Dashboard;
