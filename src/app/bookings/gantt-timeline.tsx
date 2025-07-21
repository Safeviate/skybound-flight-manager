
'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { aircraftData } from '@/lib/mock-data';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';

const hourWidth = 120; // 120px per hour for 15-min increments
const rowHeight = 96; // 6rem

const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'default';
        case 'Maintenance': return 'destructive';
        case 'Private': return 'secondary';
        default: return 'outline';
    }
};

interface GanttTimelineProps {
    bookings: Booking[];
    currentDay: Date;
}

export function GanttTimeline({ bookings, currentDay }: GanttTimelineProps) {
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
            {aircraftData.map((aircraft, rowIndex) => (
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
