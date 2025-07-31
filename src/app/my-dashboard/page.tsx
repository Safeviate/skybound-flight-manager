
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Booking, Alert } from '@/lib/types';
import { Calendar, Bell, Plane, Clock, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function MyDashboardPage() {
  const { user, company, loading, getUnacknowledgedAlerts, acknowledgeAlerts } = useUser();
  const router = useRouter();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [acknowledgedOnPage, setAcknowledgedOnPage] = useState<string[]>([]);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && company) {
      const fetchData = async () => {
        setDataLoading(true);
        try {
          // Fetch upcoming bookings for the current user
          const bookingsQuery = query(
            collection(db, `companies/${company.id}/bookings`),
            where('student', '==', user.name),
            where('date', '>=', format(new Date(), 'yyyy-MM-dd')),
            orderBy('date'),
            orderBy('startTime')
          );
          const instructorBookingsQuery = query(
            collection(db, `companies/${company.id}/bookings`),
            where('instructor', '==', user.name),
            where('date', '>=', format(new Date(), 'yyyy-MM-dd')),
            orderBy('date'),
            orderBy('startTime')
          );

          const [bookingsSnapshot, instructorBookingsSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(instructorBookingsQuery),
          ]);
          
          const userBookings = bookingsSnapshot.docs.map(doc => doc.data() as Booking);
          const instructorBookings = instructorBookingsSnapshot.docs.map(doc => doc.data() as Booking);

          const combinedBookings = [...userBookings, ...instructorBookings].filter((v,i,a)=>a.findIndex(t=>(t.id === v.id))===i);

          setUpcomingBookings(combinedBookings);

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setDataLoading(false);
        }
      };
      fetchData();
    } else if (!loading && !company && user?.permissions.includes('Super User')) {
        // If super user lands here without a company context, send them to the main companies page
        router.push('/');
    } else if (!loading) {
        setDataLoading(false);
    }
  }, [user, company, loading, router]);
  
    useEffect(() => {
        // This effect runs when getUnacknowledgedAlerts changes, which happens when allAlerts is updated.
        const unacknowledged = getUnacknowledgedAlerts([]);
        setAlerts(unacknowledged);
    }, [getUnacknowledgedAlerts]);

  if (loading || dataLoading) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
    );
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-4 w-4 text-destructive" />;
        case 'Yellow Tag': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        default: return <Bell className="h-4 w-4 text-primary" />;
    }
}

const handleAcknowledge = async (alertId: string) => {
    if (!user) return;
    try {
      await acknowledgeAlerts([alertId]);
      setAcknowledgedOnPage(prev => [...prev, alertId]);
    } catch (error) {
      console.error("Failed to acknowledge alert", error);
    }
  };

  const displayedAlerts = alerts.filter(a => !acknowledgedOnPage.includes(a.id));

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar />
              Your Upcoming Bookings
            </CardTitle>
            <CardDescription>
                These are your scheduled flights and training sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Aircraft</TableHead>
                            <TableHead>Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {upcomingBookings.map(booking => (
                            <TableRow key={booking.id}>
                                <TableCell>
                                    <Badge variant={isToday(parseISO(booking.date)) ? "default" : "outline"}>
                                        {format(parseISO(booking.date), 'MMM d, yyyy')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium flex items-center gap-2">
                                    <Plane className="h-4 w-4 text-muted-foreground" />
                                    {booking.aircraft}
                                </TableCell>
                                <TableCell>
                                    <Clock className="h-4 w-4 text-muted-foreground inline mr-2" />
                                    {booking.startTime} - {booking.endTime}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-10">You have no upcoming bookings.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell />
              Outstanding Alerts
            </CardTitle>
            <CardDescription>
                Notifications and tasks that require your attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {displayedAlerts.length > 0 ? (
                <ul className="space-y-4">
                    {displayedAlerts.map(alert => (
                        <li key={alert.id} className="flex items-start gap-4">
                            <div className="p-2 bg-muted rounded-full">
                                {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">{alert.title}</p>
                                <p className="text-sm text-muted-foreground">{alert.description}</p>
                            </div>
                             <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Acknowledge
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                    <Check className="h-12 w-12 text-green-500 bg-green-100 rounded-full p-2 mb-4" />
                    <p className="font-semibold">All Caught Up!</p>
                    <p className="text-sm text-muted-foreground">You have no outstanding alerts.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

MyDashboardPage.title = 'My Dashboard';
export default MyDashboardPage;
