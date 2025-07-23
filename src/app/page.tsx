
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Users, Calendar, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';

function Dashboard() {
  const { user, company, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<{title: string; value: string; icon: JSX.Element; href: string}[]>([]);
  const [recentActivities, setRecentActivities] = useState<{type: string, description: string, time: string}[]>([]);

  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!company) return;

    const fetchDashboardData = async () => {
        try {
            const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
            const aircraftSnapshot = await getDocs(aircraftQuery);

            const studentsQuery = query(collection(db, `companies/${company.id}/users`), where('role', '==', 'Student'), where('status', '==', 'Active'));
            const studentsSnapshot = await getDocs(studentsQuery);

            const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`), where('date', '>=', new Date().toISOString().split('T')[0]));
            const bookingsSnapshot = await getDocs(bookingsQuery);

            const safetyReportsQuery = query(collection(db, `companies/${company.id}/safety-reports`), where('status', '!=', 'Closed'));
            const safetyReportsSnapshot = await getDocs(safetyReportsQuery);

            setStats([
                { title: 'Total Aircraft', value: aircraftSnapshot.size.toString(), icon: <Plane className="h-8 w-8 text-primary" />, href: '/aircraft' },
                { title: 'Active Students', value: studentsSnapshot.size.toString(), icon: <Users className="h-8 w-8 text-primary" />, href: '/students' },
                { title: 'Upcoming Bookings', value: bookingsSnapshot.size.toString(), icon: <Calendar className="h-8 w-8 text-primary" />, href: '/bookings' },
                { title: 'Open Safety Reports', value: safetyReportsSnapshot.size.toString(), icon: <ShieldAlert className="h-8 w-8 text-destructive" />, href: '/safety' },
            ]);

            // Fetch recent activities
            const recentBookingsQuery = query(collection(db, `companies/${company.id}/bookings`), orderBy('date', 'desc'), limit(1));
            const lastBookingSnap = await getDocs(recentBookingsQuery);
            const activities = [];
            if (!lastBookingSnap.empty) {
                const lastBooking = lastBookingSnap.docs[0].data();
                activities.push({ type: 'New Booking', description: `${lastBooking.aircraft} for ${lastBooking.student}`, time: 'Recent' });
            }
            setRecentActivities(activities);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        }
    };
    fetchDashboardData();
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
                {recentActivities.length > 0 ? recentActivities.map((activity, index) => (
                  <li key={index}>
                    <p className="font-medium">{activity.type}</p>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </li>
                )) : <p className="text-sm text-muted-foreground">No recent activity.</p>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
  );
}

Dashboard.title = 'Dashboard';
export default Dashboard;
