
'use client';

import { useState, useRef, useEffect, UIEvent } from 'react';
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
import { GanttAircraftColumn } from './gantt-aircraft-column';
import { GanttTimeline } from './gantt-timeline';


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

function GanttView({ bookings }: { bookings: Booking[] }) {
    const [currentDay, setCurrentDay] = useState(startOfDay(new Date('2024-08-15')));
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const aircraftColumnRef = useRef<HTMLDivElement>(null);

    const nextDay = () => setCurrentDay(addDays(currentDay, 1));
    const prevDay = () => setCurrentDay(subDays(currentDay, 1));

    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        if (aircraftColumnRef.current) {
            aircraftColumnRef.current.scrollTop = event.currentTarget.scrollTop;
        }
    };

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
            <div className="grid grid-cols-[150px_1fr] border rounded-lg overflow-hidden">
                <div className="font-semibold p-2 border-b border-r bg-muted flex items-end">
                    Aircraft
                </div>
                <ScrollArea className="border-b" style={{height: '40px'}}>
                     <div className="flex h-10" style={{width: `${24 * 120}px`}}>
                         {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                            <div key={hour} className="p-2 text-center border-l font-semibold text-sm w-[120px] flex-shrink-0">
                                {format(new Date(0, 0, 0, hour), 'HH:mm')}
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                <div ref={aircraftColumnRef} className="overflow-y-hidden border-r bg-muted" style={{maxHeight: 'calc(100vh - 400px)'}}>
                   <GanttAircraftColumn />
                </div>
                
                <ScrollArea ref={timelineContainerRef} onScroll={handleScroll} style={{maxHeight: 'calc(100vh - 400px)'}}>
                    <GanttTimeline bookings={bookings} currentDay={currentDay} />
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
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
    const [viewMode, setViewMode] = useState<ViewMode>('gantt');

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
