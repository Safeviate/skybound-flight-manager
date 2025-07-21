
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { aircraftData } from '@/lib/mock-data';
import type { Booking, Aircraft } from '@/lib/types';
import { format, parseISO, isSameDay, addDays, subDays, eachDayOfInterval, startOfDay, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, subMonths, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, GanttChartSquare, BookCopy, Check, Ban, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogFlightForm } from './log-flight-form';
import { useUser } from '@/context/user-provider';
import { useSettings } from '@/context/settings-provider';
import { cn } from '@/lib/utils.tsx';


type ViewMode = 'month' | 'gantt';

const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'default';
        case 'Maintenance': return 'destructive';
        case 'Private': return 'secondary';
        default: return 'outline';
    }
};

const getStatusVariant = (status: Booking['status']) => {
    switch (status) {
        case 'Completed': return 'success';
        case 'Approved': return 'primary';
        case 'Cancelled': return 'destructive';
        default: return 'outline';
    }
};

interface MonthViewProps {
    bookings: Booking[];
    fleet: Aircraft[];
    onFlightLogged: (bookingId: string) => void;
    onApproveBooking: (bookingId: string) => void;
}

function MonthView({ bookings, fleet, onFlightLogged, onApproveBooking }: MonthViewProps) {
    const today = startOfDay(new Date('2024-08-15'));
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
    const [dialogsOpen, setDialogsOpen] = useState<{ [key: string]: boolean }>({});
    const { user } = useUser();
    const { settings } = useSettings();

    const firstDayOfMonth = startOfWeek(currentMonth);
    const lastDayOfMonth = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getBookingsForDay = (day: Date) => {
        return bookings
            .filter(booking => isSameDay(parseISO(booking.date), day))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const handleFlightLoggedAndClose = (bookingId: string) => {
        onFlightLogged(bookingId);
        setDialogsOpen(prev => ({ ...prev, [bookingId]: false }));
    };

    const userCanApprove = (booking: Booking) => {
        if (!user) return false;
        if (user.permissions.includes('Super User') || user.permissions.includes('Bookings:Approve')) {
            return true;
        }
        return user.name === booking.instructor;
    }

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    
    return (
        <div className="flex flex-col h-[calc(100vh-280px)]">
             <div className="flex items-center justify-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold w-40 text-center">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <div className="grid grid-cols-7 border-t border-l">
                 {weekdays.map((day) => (
                    <div key={day} className="p-2 text-center font-semibold text-sm border-b border-r bg-muted/50">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l">
                {days.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "border-r border-b p-2 relative flex flex-col",
                                isSameMonth(day, currentMonth) ? '' : 'bg-muted/30 text-muted-foreground',
                                isSameDay(day, today) && 'bg-blue-100 dark:bg-blue-900/30'
                            )}
                        >
                            <span className={cn(
                                'font-semibold mb-2',
                                isSameDay(day, today) && 'text-primary'
                            )}>
                                {format(day, 'd')}
                            </span>
                            <div className="space-y-1 overflow-y-auto">
                                {dayBookings.map(booking => (
                                     <TooltipProvider key={booking.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className={cn(
                                                    'p-1.5 rounded-md text-xs text-white overflow-hidden text-left cursor-pointer',
                                                    getPurposeVariant(booking.purpose) === 'destructive' ? 'bg-destructive' : 'bg-primary'
                                                )}>
                                                    <p className="font-semibold truncate">{booking.startTime} - {booking.aircraft}</p>
                                                    <p className="truncate">{booking.purpose}</p>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{booking.aircraft} ({booking.purpose})</p>
                                                <p>Time: {booking.startTime} - {booking.endTime}</p>
                                                <p>Instructor: {booking.instructor}</p>
                                                <p>Student: {booking.student}</p>
                                                <p>Status: {booking.status}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface GanttViewProps {
    bookings: Booking[];
}

function GanttView({ bookings }: GanttViewProps) {
    const [currentDay, setCurrentDay] = useState(startOfDay(new Date('2024-08-15')));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const bookingsByAircraft = bookings.reduce((acc, booking) => {
        if (!acc[booking.aircraft]) {
            acc[booking.aircraft] = [];
        }
        acc[booking.aircraft].push(booking);
        return acc;
    }, {} as Record<string, Booking[]>);

    const nextDay = () => setCurrentDay(addDays(currentDay, 1));
    const prevDay = () => setCurrentDay(subDays(currentDay, 1));

    return (
        <TooltipProvider>
            <div className="flex items-center justify-center gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={prevDay}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold w-48 text-center">
                    {format(currentDay, 'eeee, MMMM d')}
                </h2>
                <Button variant="outline" size="icon" onClick={nextDay}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="relative" style={{'--hour-width': '120px'} as React.CSSProperties}>
                    <div className="grid sticky top-0 z-20 bg-background" style={{ gridTemplateColumns: '150px repeat(24, var(--hour-width))' }}>
                        <div className="p-2 border-b border-r font-semibold flex items-end sticky left-0 bg-background z-10">Aircraft</div>
                        {hours.map(hour => (
                            <div key={hour} className="p-2 text-center border-b border-l font-semibold text-sm">
                                {format(new Date(0, 0, 0, hour), 'HH:mm')}
                            </div>
                        ))}
                    </div>

                    <div className="divide-y">
                        {aircraftData.map(aircraft => (
                            <div key={aircraft.id} className="grid relative" style={{ gridTemplateColumns: '150px repeat(24, var(--hour-width))' }}>
                                <div className="p-2 border-r font-medium text-sm flex items-center h-24 sticky left-0 bg-background z-10">
                                    {aircraft.tailNumber}
                                </div>
                                {hours.map(hour => (
                                    <div key={hour} className="h-24 border-l relative flex">
                                        {/* 15-minute grid lines */}
                                        <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                                        <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                                        <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                                        <div className="w-1/4 h-full"></div>
                                    </div>
                                ))}
                                {/* Render bookings for this aircraft */}
                                {(bookingsByAircraft[aircraft.tailNumber] || [])
                                    .filter(b => isSameDay(parseISO(b.date), currentDay))
                                    .map(booking => {
                                        const startHour = parseInt(booking.startTime.split(':')[0]);
                                        const startMinute = parseInt(booking.startTime.split(':')[1]);
                                        const endHour = parseInt(booking.endTime.split(':')[0]);
                                        const endMinute = parseInt(booking.endTime.split(':')[1]);

                                        const startInMinutes = startHour * 60 + startMinute;
                                        const endInMinutes = endHour * 60 + endMinute;

                                        const left = (startInMinutes / (24 * 60)) * (24 * 120); // 120 is hour width
                                        const width = ((endInMinutes - startInMinutes) / (24 * 60)) * (24 * 120);

                                        return (
                                            <Tooltip key={booking.id}>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn(
                                                            'absolute top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white text-xs overflow-hidden h-16 flex items-center',
                                                            getPurposeVariant(booking.purpose) === 'destructive' ? 'bg-destructive' : 'bg-primary'
                                                        )}
                                                        style={{ left: `calc(150px + ${left}px)`, width: `${width}px` }}
                                                    >
                                                        <span className="truncate">{booking.purpose} - {booking.startTime}</span>
                                                        {booking.status === 'Completed' && <Check className="h-3 w-3 ml-1 flex-shrink-0" />}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{booking.aircraft} ({booking.purpose})</p>
                                                    <p>Time: {booking.startTime} - {booking.endTime}</p>
                                                    <p>Instructor: {booking.instructor}</p>
                                                    <p>Student: {booking.student}</p>
                                                    <p>Status: {booking.status}</p>
                                                    {booking.purpose === 'Training' && <p>Checklist: {booking.isChecklistComplete ? 'Complete' : 'Pending'}</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        )
                                    })
                                }
                            </div>
                        ))}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </TooltipProvider>
    );
}

interface BookingCalendarProps {
    bookings: Booking[];
    fleet: Aircraft[];
    onFlightLogged: (bookingId: string) => void;
    onApproveBooking: (bookingId: string) => void;
}

export function BookingCalendar({ bookings, fleet, onFlightLogged, onApproveBooking }: BookingCalendarProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Month
                </Button>
                <Button variant={viewMode === 'gantt' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('gantt')}>
                    <GanttChartSquare className="mr-2 h-4 w-4" />
                    Day
                </Button>
            </div>
            {viewMode === 'month' ? <MonthView bookings={bookings} fleet={fleet} onFlightLogged={onFlightLogged} onApproveBooking={onApproveBooking} /> : <GanttView bookings={bookings} />}
        </div>
    );
}
