
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
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function MyDashboardPageContent({ initialBookings }: { initialBookings: Booking[] }) {
  const { user, company, loading, getUnacknowledgedAlerts, acknowledgeAlerts } = useUser();
  const router = useRouter();
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>(initialBookings);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [acknowledgedOnPage, setAcknowledgedOnPage] = useState<string[]>([]);
  
  useEffect(() => {
    if (!loading && !user) {
        router.push('/login');
        return;
    }
    if (user && company) {
      setUpcomingBookings(initialBookings);
    } else if (!loading && !company && user?.permissions.includes('Super User')) {
        router.push('/');
    }
  }, [user, company, loading, router, initialBookings]);
  
    useEffect(() => {
        const unacknowledged = getUnacknowledgedAlerts();
        setAlerts(unacknowledged);
    }, [getUnacknowledgedAlerts]);

  if (loading || !user) {
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
              Upcoming Bookings
            </CardTitle>
            <CardDescription>
                Your scheduled flights and maintenance events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Aircraft</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {upcomingBookings.slice(0, 5).map(booking => (
                            <TableRow key={booking.id}>
                                <TableCell>
                                    <Badge variant={isToday(parseISO(booking.date)) ? 'destructive' : 'outline'}>
                                        {format(parseISO(booking.date), 'MMM dd')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{booking.aircraft}</TableCell>
                                <TableCell>{booking.purpose === 'Training' ? `w/ ${booking.instructor}` : booking.purpose}</TableCell>
                                <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center text-center py-10">
                    <Plane className="h-12 w-12 text-muted-foreground bg-muted rounded-full p-2 mb-4" />
                    <p className="font-semibold">No Upcoming Bookings</p>
                    <p className="text-sm text-muted-foreground">Your schedule is clear.</p>
                </div>
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
