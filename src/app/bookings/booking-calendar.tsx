
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { aircraftData } from '@/lib/mock-data';
import type { Booking, Aircraft } from '@/lib/types';
import { format, parseISO, isSameDay, addDays, subDays, eachDayOfInterval, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, subMonths, addMonths } from 'date-fns';
import { Calendar as CalendarIcon, GanttChartSquare, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const rowHeight = 96; // 6rem
const hourWidth = 120; // 120px per hour

const DayAircraftColumn = () => (
    <div className="flex flex-col">
        {aircraftData.map(aircraft => (
            <div 
                key={aircraft.id} 
                className="p-2 font-medium text-sm flex items-center border-b"
                style={{ height: `${rowHeight}px` }}
            >
                {aircraft.tailNumber}
            </div>
        ))}
    </div>
);

const DayTimelineHeader = () => {
    return (
      <div className="sticky top-0 z-10 bg-muted">
        <div className="flex" style={{ width: `${24 * hourWidth}px` }}>
          {Array.from({ length: 24 }, (_, i) => i).map(hour => (
            <div key={hour} className="p-2 text-center border-l font-semibold text-sm w-[120px] flex-shrink-0">
              {format(new Date(0, 0, 0, hour), 'HH:mm')}
            </div>
          ))}
        </div>
      </div>
    );
};

const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'default';
        case 'Maintenance': return 'destructive';
        case 'Private': return 'secondary';
        default: return 'outline';
    }
};

const DayTimeline = ({ bookings, currentDay }: { bookings: Booking[], currentDay: Date }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const bookingsByAircraft = bookings.reduce((acc, booking) => {
        if (!acc[booking.aircraft]) {
            acc[booking.aircraft] = [];
        }
        acc[booking.aircraft].push(booking);
        return acc;
    }, {} as Record<string, Booking[]>);

    return (
        <div className="relative" style={{ width: `${24 * hourWidth}px` }}>
            {aircraftData.map((aircraft) => (
                <div key={aircraft.id} className="grid relative" style={{ gridTemplateColumns: `repeat(24, ${hourWidth}px)`, height: `${rowHeight}px` }}>
                    {/* Grid Background */}
                    {hours.map(hour => (
                        <div key={hour} className="h-full border-l border-b relative flex">
                            <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                            <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                            <div className="w-1/4 h-full border-r border-dashed border-muted"></div>
                            <div className="w-1/4 h-full"></div>
                        </div>
                    ))}
                    
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-8xl font-bold text-muted/30 select-none">
                            {aircraft.tailNumber}
                        </span>
                    </div>

                    {/* Bookings */}
                    {(bookingsByAircraft[aircraft.tailNumber] || [])
                        .filter(b => isSameDay(parseISO(b.date), currentDay))
                        .map(booking => {
                            const startHour = parseInt(booking.startTime.split(':')[0]);
                            const startMinute = parseInt(booking.startTime.split(':')[1]);
                            const endHour = parseInt(booking.endTime.split(':')[0]);
                            const endMinute = parseInt(booking.endTime.split(':')[1]);

                            const startInMinutes = startHour * 60 + startMinute;
                            const endInMinutes = endHour * 60 + endMinute;

                            const left = (startInMinutes / 60) * hourWidth;
                            const width = ((endInMinutes - startInMinutes) / 60) * hourWidth;

                            return (
                                <TooltipProvider key={booking.id}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    'absolute top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white text-xs overflow-hidden h-16 flex items-center z-10',
                                                    getPurposeVariant(booking.purpose) === 'destructive' ? 'bg-destructive' : 'bg-primary'
                                                )}
                                                style={{ left: `${left}px`, width: `${width}px` }}
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
                                </TooltipProvider>
                            )
                        })
                    }
                </div>
            ))}
        </div>
    );
}

function DayView({ bookings }: { bookings: Booking[] }) {
    const [currentDay, setCurrentDay] = useState(startOfDay(new Date('2024-08-15')));
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    const nextDay = () => setCurrentDay(addDays(currentDay, 1));
    const prevDay = () => setCurrentDay(subDays(currentDay, 1));

    return (
        <div className="flex flex-col">
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
                <div className="font-semibold p-2 border-b border-r bg-muted flex items-end sticky top-0 z-20">
                    Aircraft
                </div>
                 <div className="font-semibold p-2 border-b bg-muted flex items-end sticky top-0 z-20" />
                
                <div className="border-r bg-muted sticky left-0 z-10">
                   <DayAircraftColumn />
                </div>
                
                <ScrollArea ref={timelineContainerRef} className="flex-1">
                    <div className="relative">
                        <DayTimelineHeader />
                        <DayTimeline bookings={bookings} currentDay={currentDay} />
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </div>
    );
}


function MonthView({ bookings, fleet, onFlightLogged, onApproveBooking }: { bookings: Booking[], fleet: Aircraft[], onFlightLogged: (bookingId: string) => void, onApproveBooking: (bookingId: string) => void }) {
    const today = startOfDay(new Date('2024-08-15'));
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
    
    const firstDayOfMonth = startOfWeek(currentMonth);
    const lastDayOfMonth = endOfWeek(endOfMonth(currentMonth));
    const days = eachDayOfInterval({ start: firstDayOfMonth, end: lastDayOfMonth });
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getBookingsForDay = (day: Date) => {
        return bookings
            .filter(booking => isSameDay(parseISO(booking.date), day))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    
    return (
        <div className="flex flex-col h-full">
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
                                    <div key={booking.id} className={cn(
                                        'p-1.5 rounded-md text-xs text-white overflow-hidden text-left cursor-pointer',
                                        booking.purpose === 'Maintenance' ? 'bg-destructive' : 'bg-primary'
                                    )}>
                                        <p className="font-semibold truncate">{booking.startTime} - {booking.aircraft}</p>
                                        <p className="truncate">{booking.purpose}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface BookingCalendarProps {
    bookings: Booking[];
    fleet: Aircraft[];
    onFlightLogged: (bookingId: string) => void;
    onApproveBooking: (bookingId: string) => void;
}

export function BookingCalendar({ bookings, fleet, onFlightLogged, onApproveBooking }: BookingCalendarProps) {
    const [viewMode, setViewMode] = useState<'month' | 'day'>('day');

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Month
                </Button>
                <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')}>
                    <GanttChartSquare className="mr-2 h-4 w-4" />
                    Day
                </Button>
            </div>
            {viewMode === 'month' ? <MonthView bookings={bookings} fleet={fleet} onFlightLogged={onFlightLogged} onApproveBooking={onApproveBooking} /> : <DayView bookings={bookings} />}
        </div>
    );
}
