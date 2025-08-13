
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { Aircraft, Booking, User, UserDocument } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, User as UserIcon, Clock, Users, Shield, CheckSquare, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parse, differenceInMinutes, isWithinInterval, startOfDay, parseISO } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { useSettings } from '@/context/settings-provider';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { differenceInDays } from 'date-fns';


interface LiveFlight {
    booking: Booking;
    aircraft: Aircraft;
    minutesRemaining: number;
    flightDurationMinutes: number;
    progress: number;
}

const LiveFlightCard = ({ flight }: { flight: LiveFlight }) => {
    return (
        <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-primary" />
                    <span className="font-bold text-lg">{flight.aircraft.tailNumber}</span>
                </div>
                <Badge variant="success">In-Flight</Badge>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 mb-3">
                 <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>
                        {flight.booking.purpose === 'Training' 
                            ? `${flight.booking.student} w/ ${flight.booking.instructor}`
                            : `Pilot: ${flight.booking.student}`
                        }
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                        {flight.booking.startTime} - {flight.booking.endTime}
                    </span>
                </div>
            </div>
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-medium">Time Remaining</span>
                    <span className="text-xs font-bold">{flight.minutesRemaining} min</span>
                </div>
                <Progress value={flight.progress} indicatorClassName="bg-primary" />
            </div>
        </div>
    )
}

interface DashboardPageContentProps {
    initialAircraft: Aircraft[];
    initialBookings: Booking[];
    initialUsers: User[];
}

export function DashboardPageContent({
    initialAircraft,
    initialBookings,
    initialUsers
}: DashboardPageContentProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const { settings } = useSettings();

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const liveFlights: LiveFlight[] = useMemo(() => {
        const todayStr = format(currentTime, 'yyyy-MM-dd');
        
        return initialBookings
            .filter(b => b.date === todayStr && b.status === 'Approved' && b.purpose !== 'Maintenance')
            .map(booking => {
                const now = currentTime;
                const startTime = parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                const endTime = parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

                if (isWithinInterval(now, { start: startTime, end: endTime })) {
                    const aircraft = initialAircraft.find(a => a.tailNumber === booking.aircraft);
                    if (!aircraft) return null;

                    const minutesRemaining = differenceInMinutes(endTime, now);
                    const flightDurationMinutes = differenceInMinutes(endTime, startTime);
                    const progress = ((flightDurationMinutes - minutesRemaining) / flightDurationMinutes) * 100;
                    
                    return { booking, aircraft, minutesRemaining, flightDurationMinutes, progress };
                }
                return null;
            })
            .filter((flight): flight is LiveFlight => flight !== null);
    }, [currentTime, initialBookings, initialAircraft]);
    
    const stats = useMemo(() => {
        const openSafetyReports = 0; // Placeholder
        const openQualityAudits = 0; // Placeholder
        const activeAircraft = initialAircraft.filter(a => a.status === 'Available').length;
        const totalAircraft = initialAircraft.filter(a => a.status !== 'Archived').length;

        const expiringDocs: { user: User, doc: UserDocument, daysUntil: number }[] = [];
        initialUsers.forEach(user => {
            if (user.status === 'Archived') return;
            
            const today = startOfDay(new Date());
            
            (user.documents || []).forEach(doc => {
                if (!doc.expiryDate) return;
                const expiry = startOfDay(parseISO(doc.expiryDate));
                const daysUntil = differenceInDays(expiry, today);
                if (daysUntil <= settings.expiryWarningYellowDays) {
                    expiringDocs.push({ user, doc, daysUntil });
                }
            });
        });

        expiringDocs.sort((a, b) => a.daysUntil - b.daysUntil);

        return {
            openSafetyReports,
            openQualityAudits,
            activeAircraft,
            totalAircraft,
            expiringDocs,
        }
    }, [initialAircraft, initialUsers, settings]);


    return (
        <main className="flex-1 p-4 md:p-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                     <div className="grid gap-6 sm:grid-cols-2">
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Aircraft</CardTitle>
                                <Plane className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.activeAircraft} / {stats.totalAircraft}</div>
                                <p className="text-xs text-muted-foreground">Aircraft available for booking</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Open Safety Reports</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.openSafetyReports}</div>
                                <p className="text-xs text-muted-foreground">Reports requiring investigation</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Open Quality Audits</CardTitle>
                                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.openQualityAudits}</div>
                                <p className="text-xs text-muted-foreground">Audits currently in progress</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Live Flight Status</CardTitle>
                            <CardDescription>
                                Overview of all aircraft currently in flight based on schedule. Last updated: {format(currentTime, 'HH:mm')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {liveFlights.length > 0 ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {liveFlights.map(flight => (
                                        <LiveFlightCard key={flight.booking.id} flight={flight} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                                    <Plane className="h-10 w-10 mb-2" />
                                    <p className="font-medium">All aircraft are on the ground.</p>
                                    <p className="text-xs">No active bookings at this time.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                
                {/* Right Column */}
                 <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle />
                                Expiring Documents ({stats.expiringDocs.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stats.expiringDocs.length > 0 ? (
                                <ScrollArea className="h-[calc(100%-4rem)]">
                                    <div className="space-y-4 pr-4">
                                    {stats.expiringDocs.map((item, index) => {
                                        let itemClass = '';
                                        if (item.daysUntil < 0) {
                                            itemClass = 'bg-destructive/20 border-destructive text-foreground';
                                        } else if (item.daysUntil <= settings.expiryWarningOrangeDays) {
                                            itemClass = 'bg-yellow-400/20 border-yellow-500 text-foreground';
                                        }
                                        return (
                                        <div key={index} className={cn("p-3 border rounded-lg", itemClass)}>
                                            <p className="font-semibold text-sm">{item.doc.type}</p>
                                            <p className="text-sm">{item.user.name}</p>
                                            <p className={cn("text-xs font-medium mt-1")}>
                                                 {item.daysUntil < 0 
                                                    ? `Has expired`
                                                    : `Expires in ${item.daysUntil} days on ${format(parseISO(item.doc.expiryDate!), 'MMM d, yyyy')}`
                                                }
                                            </p>
                                        </div>
                                    )})}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <p className="text-sm text-muted-foreground h-full flex items-center justify-center">No personnel documents are expiring soon.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
