
'use client';

import * as React from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/user-provider';

const HOUR_HEIGHT = 60; // 60px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getBookingStyle = (booking: Booking): React.CSSProperties => {
    try {
        const [startHour, startMinute] = booking.startTime.split(':').map(Number);
        const [endHour, endMinute] = booking.endTime.split(':').map(Number);

        const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
        const height = (endHour + endMinute / 60) * HOUR_HEIGHT - top;

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    } catch (e) {
        console.error("Error calculating booking style", e);
        return {};
    }
};

const getBookingColor = (booking: Booking, aircraftList: Aircraft[]) => {
    const aircraft = aircraftList.find(a => a.tailNumber === booking.aircraft);
    
    if (aircraft?.checklistStatus) {
        switch (aircraft.checklistStatus) {
            case 'needs-pre-flight':
                return 'bg-gray-400 border-gray-600'; // Pre-flight outstanding (or cycle complete)
            case 'needs-post-flight':
                return 'bg-blue-500 border-blue-700'; // Post-flight outstanding
            default:
                 // Assuming a completed post-flight resets to 'needs-pre-flight', so green indicates the booking's cycle is done.
                 // This might need refinement based on exact status flow. For now, let's assume 'completed' is a distinct state for the booking itself.
                 if (booking.status === 'Completed') {
                    return 'bg-green-500 border-green-700';
                 }
                return 'bg-gray-400 border-gray-600';
        }
    }

    // Fallback to original purpose-based color if checklist status is not available
    switch (booking.purpose) {
        case 'Training': return 'bg-blue-500/80 border-blue-700';
        case 'Maintenance': return 'bg-amber-500/80 border-amber-700';
        case 'Private': return 'bg-green-500/80 border-green-700';
        default: return 'bg-gray-500/80 border-gray-700';
    }
};


export function DayViewCalendar({ 
    bookings, 
    aircraft, 
    selectedDay, 
    onDayChange,
    onNewBooking 
}: { 
    bookings: Booking[], 
    aircraft: Aircraft[], 
    selectedDay: Date, 
    onDayChange: (newDate: Date) => void,
    onNewBooking: (aircraft: Aircraft | null, time: string | null) => void
}) {
    const { user } = useUser();
    const canEdit = user?.permissions.includes('Bookings:Edit') || user?.permissions.includes('Super User');

    const dayString = format(selectedDay, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dayString);

    const timeLineRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const updateTimeline = () => {
            if (timeLineRef.current) {
                const now = new Date();
                const top = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT;
                timeLineRef.current.style.top = `${top}px`;
            }
        };

        if(format(selectedDay, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) {
            updateTimeline();
            const interval = setInterval(updateTimeline, 60000); // Update every minute
            return () => clearInterval(interval);
        } else {
            if(timeLineRef.current) {
                timeLineRef.current.style.display = 'none';
            }
        }
    }, [selectedDay]);

    return (
        <div className="flex flex-col h-full">
            <div className="relative overflow-x-auto border rounded-t-lg">
                <div 
                    className="grid sticky top-0 z-10 bg-background" 
                    style={{ gridTemplateColumns: `60px repeat(${aircraft.length}, minmax(150px, 1fr))`}}
                >
                    <div className="row-start-1 p-2 border-r border-b">&nbsp;</div>
                    {aircraft.map((ac) => (
                        <div key={ac.id} className="row-start-1 p-2 border-b border-r text-center font-semibold">
                            {ac.tailNumber}
                            <p className="text-xs text-muted-foreground font-normal">{ac.model}</p>
                        </div>
                    ))}
                </div>

                <div className="h-[calc(100vh-20rem)] overflow-y-auto">
                    <div 
                        className="grid relative bg-background"
                        style={{ gridTemplateColumns: `60px repeat(${aircraft.length}, minmax(150px, 1fr))`}}
                    >
                        {/* Time Gutter */}
                        <div className="col-start-1 border-r">
                            {HOURS.map(hour => (
                                <div key={hour} className="relative h-[60px] text-right">
                                    <span className="text-xs text-muted-foreground pr-2 -translate-y-1/2 absolute">
                                        {format(new Date(0, 0, 0, hour), 'h a')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Columns for each aircraft */}
                        {aircraft.map((ac, index) => (
                             <div key={ac.id} className="col-start-2 col-span-1 relative border-r">
                                {/* Grid lines and clickable cells */}
                                {HOURS.map(hour => (
                                    <div 
                                        key={hour} 
                                        className="h-[60px] border-b hover:bg-muted/50 cursor-pointer"
                                        onClick={() => canEdit && onNewBooking(ac, `${String(hour).padStart(2, '0')}:00`)}
                                    />
                                ))}
                                
                                {/* Bookings */}
                                {dayBookings.filter(b => b.aircraft === ac.tailNumber).map(booking => (
                                    <TooltipProvider key={booking.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn("absolute w-full p-2 text-white text-xs rounded-md border-l-4 overflow-hidden", getBookingColor(booking, aircraft))}
                                                    style={getBookingStyle(booking)}
                                                >
                                                    <p className="font-bold">{booking.purpose}</p>
                                                    <p>{booking.startTime} - {booking.endTime}</p>
                                                    <p>{booking.student || booking.instructor || ''}</p>
                                                </div>
                                            </TooltipTrigger>
                                             <TooltipContent>
                                                <p className="font-bold">{booking.aircraft} ({booking.purpose})</p>
                                                <p>{booking.startTime} - {booking.endTime}</p>
                                                {booking.student && <p>Student: {booking.student}</p>}
                                                {booking.instructor && <p>Instructor: {booking.instructor}</p>}
                                                {booking.maintenanceType && <p>Details: {booking.maintenanceType}</p>}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        ))}
                         <div ref={timeLineRef} className="absolute w-full border-t-2 border-red-500 z-20 flex items-center">
                            <div className="h-2 w-2 bg-red-500 rounded-full -ml-1"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
