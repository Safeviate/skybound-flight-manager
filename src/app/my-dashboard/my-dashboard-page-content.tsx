'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import type { Booking } from '@/lib/types';
import { getDashboardData } from './data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Shield, ListChecks, Calendar, Plane, Clock, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

function MyDashboardPageContent() {
  const { user, company, loading: userLoading } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function fetchDashboardData() {
        if (!userLoading && user && company) {
            setIsLoading(true);
            const data = await getDashboardData(company.id, user.id);
            setBookings(data.bookingsList);
            setIsLoading(false);
        } else if (!userLoading && (!user || !company)) {
            setIsLoading(false);
        }
    }
    fetchDashboardData();
  }, [user, company, userLoading]);

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">Here’s what’s happening today.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                    <Link href="/safety/new">
                        <Shield />
                        File Safety Report
                    </Link>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                    <Link href="/aircraft">
                        <ListChecks />
                        Perform Checklist
                    </Link>
                </Button>
                 <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                    <Link href="/training-schedule">
                        <PlusCircle />
                        New Booking
                    </Link>
                </Button>
                 <Button variant="outline" className="h-20 flex-col gap-2" asChild>
                    <Link href="/students">
                        <UserCheck />
                        View Students
                    </Link>
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Your Upcoming Schedule</CardTitle>
                <CardDescription>
                    Your next 5 scheduled flights and bookings.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <p className="text-muted-foreground">Loading your schedule...</p>
                    </div>
                ) : bookings.length > 0 ? (
                    <div className="space-y-4">
                        {bookings.slice(0, 5).map(booking => (
                            <div key={booking.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={booking.purpose === 'Training' ? 'default' : 'secondary'}>{booking.purpose}</Badge>
                                        <p className="font-semibold">{format(parseISO(booking.date), 'EEEE, MMM d')}</p>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> {booking.startTime} - {booking.endTime}</span>
                                        <span className="flex items-center gap-1.5"><Plane className="h-4 w-4"/> {booking.aircraft}</span>
                                    </div>
                                    <p className="text-sm">
                                        {booking.purpose === 'Training' && `Student: ${booking.student} | Instructor: ${booking.instructor}`}
                                        {booking.purpose === 'Private' && `Pilot: ${booking.student}`}
                                        {booking.purpose === 'Maintenance' && `Details: ${booking.maintenanceType}`}
                                    </p>
                                </div>
                                <Button asChild variant="secondary" size="sm" className="mt-2 sm:mt-0">
                                    <Link href="/training-schedule">Go to Schedule</Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">You have no upcoming bookings.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </main>
  );
}
