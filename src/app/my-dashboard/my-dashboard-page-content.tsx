
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/context/user-provider';
import type { Alert as AlertType, Booking, SafetyReport, QualityAudit, User as StudentUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Shield, ListChecks, Calendar, Plane, Clock, UserCheck, BellRing, Inbox, Check, AlertTriangle, MessageSquare, Signature } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AtAGlanceCard } from './at-a-glance-card';
import { getDashboardData } from './data';
import { DevTodoList } from './dev-todo-list';

const getAlertIcon = (type: AlertType['type']) => {
    switch (type) {
        case 'Task': return <ListChecks className="h-4 w-4 text-primary" />;
        case 'Signature Request': return <Signature className="h-4 w-4 text-amber-600" />;
        case 'System Health': return <AlertTriangle className="h-4 w-4 text-destructive" />;
        default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
}

interface DashboardData {
    upcomingBookings: Booking[];
    allUserBookings: Booking[];
    openSafetyReports: SafetyReport[];
    openQualityAudits: QualityAudit[];
    assignedStudents: StudentUser[];
}

export function MyDashboardPageContent({ initialData }: { initialData: DashboardData }) {
  const { user, company, loading: userLoading, getUnacknowledgedAlerts, acknowledgeAlerts } = useUser();
  const [data, setData] = useState<DashboardData>(initialData);
  const [dataLoading, setDataLoading] = useState(false);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const { toast } = useToast();
  
  const fetchDashboardData = useCallback(async () => {
    if (!user || !company) return;
    setDataLoading(true);
    try {
        const fetchedData = await getDashboardData(company.id, user.id);
        setData(fetchedData);
    } catch (error) {
        console.error("Error fetching dashboard data on client:", error);
        toast({
            variant: "destructive",
            title: "Error Loading Data",
            description: "Could not load all dashboard data. Please refresh the page.",
        });
    } finally {
        setDataLoading(false);
    }
  }, [user, company, toast]);

  useEffect(() => {
    // This effect runs if the initial server-side fetch couldn't get a user ID.
    // It refetches data on the client once the user context is available.
    if (!userLoading && user && company && !initialData.upcomingBookings.length) {
      fetchDashboardData();
    }
  }, [user, userLoading, company, fetchDashboardData, initialData.upcomingBookings.length]);
  
  useEffect(() => {
    if (!userLoading && user) {
        setAlerts(getUnacknowledgedAlerts());
    }
  }, [user, userLoading, getUnacknowledgedAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlerts([alertId]);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    toast({
        title: "Notification Acknowledged",
        description: "The item has been removed from your inbox.",
    });
  }
  
  const isLoading = userLoading || dataLoading;

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">Here’s what’s happening today.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <AtAGlanceCard 
                    user={user} 
                    bookings={data.allUserBookings} 
                    openSafetyReports={data.openSafetyReports} 
                    openQualityAudits={data.openQualityAudits}
                    assignedStudents={data.assignedStudents}
                    isLoading={isLoading}
                />
                
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
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                <p className="text-muted-foreground">Loading your schedule...</p>
                            </div>
                        ) : data.upcomingBookings.length > 0 ? (
                            <div className="space-y-4">
                                {data.upcomingBookings.slice(0, 5).map(booking => (
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
                 {process.env.NODE_ENV === 'development' && <DevTodoList />}
            </div>
            <div className="lg:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-primary" />
                            My Inbox ({alerts.length})
                        </CardTitle>
                         <CardDescription>
                            Action items and notifications assigned to you.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         {userLoading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            </div>
                        ) : alerts.length > 0 ? (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {alerts.map(alert => (
                                    <div key={alert.id} className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            {getAlertIcon(alert.type)}
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm leading-tight">{alert.title}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end items-center gap-2 mt-2 pt-2 border-t">
                                            {alert.relatedLink && (
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={alert.relatedLink}>View Details</Link>
                                                </Button>
                                            )}
                                            <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
                                                <Check className="mr-2 h-4 w-4" /> Acknowledge
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground p-4">
                                <Inbox className="h-10 w-10 mb-2" />
                                <p className="font-medium">All caught up!</p>
                                <p className="text-xs">You have no new notifications.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </main>
  );
}
