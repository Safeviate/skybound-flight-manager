
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Users, Calendar, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/context/user-provider';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';

type Activity = {
    type: string;
    description: string;
    time: string;
    icon: React.ReactNode;
}

type UpcomingBooking = {
    id: string;
    description: string;
    details: string;
    icon: React.ReactNode;
}

function Dashboard() {
  const { user, company, loading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<{title: string; value: string; icon: JSX.Element; href: string}[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);

  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!company) return;

    const fetchDashboardData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            // Stats
            const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
            const studentsQuery = query(collection(db, `companies/${company.id}/users`), where('role', '==', 'Student'), where('status', '==', 'Active'));
            const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`), where('date', '>=', today));
            const safetyReportsQuery = query(collection(db, `companies/${company.id}/safety-reports`), where('status', '!=', 'Closed'));

            const [aircraftSnapshot, studentsSnapshot, bookingsSnapshot, safetyReportsSnapshot] = await Promise.all([
                getDocs(aircraftQuery),
                getDocs(studentsQuery),
                getDocs(bookingsQuery),
                getDocs(safetyReportsQuery),
            ]);

            setStats([
                { title: 'Total Aircraft', value: aircraftSnapshot.size.toString(), icon: <Plane className="h-8 w-8 text-primary" />, href: '/aircraft' },
                { title: 'Active Students', value: studentsSnapshot.size.toString(), icon: <Users className="h-8 w-8 text-primary" />, href: '/students' },
                { title: 'Upcoming Bookings', value: bookingsSnapshot.size.toString(), icon: <Calendar className="h-8 w-8 text-primary" />, href: '/bookings' },
                { title: 'Open Safety Reports', value: safetyReportsSnapshot.size.toString(), icon: <ShieldAlert className="h-8 w-8 text-destructive" />, href: '/safety' },
            ]);

            // Upcoming Schedule
            const upcomingBookingsQuery = query(
                collection(db, `companies/${company.id}/bookings`),
                where('date', '>=', today),
                orderBy('date'),
                orderBy('startTime'),
                limit(3)
            );
            const upcomingBookingsSnapshot = await getDocs(upcomingBookingsQuery);
            const bookingsList = upcomingBookingsSnapshot.docs.map(doc => {
                const booking = doc.data();
                const bookingDate = parseISO(booking.date);
                const isToday = format(bookingDate, 'yyyy-MM-dd') === today;
                const dateLabel = isToday ? 'Today' : format(bookingDate, 'MMM d');

                return {
                    id: doc.id,
                    description: `${booking.purpose} with ${booking.student || booking.instructor}`,
                    details: `${booking.aircraft} | ${dateLabel} at ${booking.startTime}`,
                    icon: booking.purpose === 'Maintenance' ? <Plane className="h-5 w-5 text-accent-foreground"/> : <Calendar className="h-5 w-5 text-accent-foreground"/>
                }
            });
            setUpcomingBookings(bookingsList);

            // Recent Activities
            const recentSafetyReportsQuery = query(
                collection(db, `companies/${company.id}/safety-reports`),
                orderBy('filedDate', 'desc'),
                limit(3)
            );
            const recentSafetyReportsSnapshot = await getDocs(recentSafetyReportsQuery);
            const activitiesList = recentSafetyReportsSnapshot.docs.map(doc => {
                const report = doc.data();
                return {
                    type: 'New Safety Report',
                    description: `${report.reportNumber} - ${report.heading}`,
                    time: format(parseISO(report.filedDate), 'MMM d, yyyy'),
                    icon: <ShieldAlert className="h-5 w-5 text-destructive" />
                }
            });
            setRecentActivities(activitiesList);

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
                {upcomingBookings.length > 0 ? (
                    upcomingBookings.map(booking => (
                        <li key={booking.id} className="flex items-center space-x-4">
                            <div className="p-2 bg-accent/20 rounded-lg">{booking.icon}</div>
                            <div>
                                <p className="font-medium">{booking.description}</p>
                                <p className="text-sm text-muted-foreground">{booking.details}</p>
                            </div>
                        </li>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
                )}
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
                  <li key={index} className="flex items-center space-x-4">
                    <div className="p-2 bg-muted rounded-lg">{activity.icon}</div>
                    <div>
                        <p className="font-medium">{activity.type}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
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
