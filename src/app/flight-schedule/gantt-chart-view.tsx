
'use client';

import * as React from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUser } from '@/context/user-provider';

const getBookingColor = (booking: Booking, aircraftList: Aircraft[]) => {
    const aircraft = aircraftList.find(a => a.tailNumber === booking.aircraft);
    
    if (aircraft?.checklistStatus) {
        switch (aircraft.checklistStatus) {
            case 'needs-pre-flight':
                return 'bg-gray-400';
            case 'needs-post-flight':
                return 'bg-blue-500';
             default:
                 if (booking.status === 'Completed') {
                    return 'bg-green-500';
                 }
                return 'bg-gray-400';
        }
    }

    // Fallback to original purpose-based color
    switch (booking.purpose) {
        case 'Training': return 'bg-blue-500';
        case 'Maintenance': return 'bg-amber-500';
        case 'Private': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
};

const START_HOUR = 6;
const END_HOUR = 24;

export function GanttChartView({
    bookings,
    aircraft,
    selectedDay,
    onNewBooking,
}: {
    bookings: Booking[];
    aircraft: Aircraft[];
    selectedDay: Date;
    onNewBooking: (aircraft: Aircraft, time: string) => void;
}) {
    const { user } = useUser();
    const canEdit = user?.permissions.includes('Bookings:Edit') || user?.permissions.includes('Super User');
    const dayString = format(selectedDay, 'yyyy-MM-dd');
    const dayBookings = bookings.filter(b => b.date === dayString);
    const totalHours = END_HOUR - START_HOUR;
    const hours = Array.from({ length: totalHours }, (_, i) => START_HOUR + i);

    const getBookingPosition = (booking: Booking) => {
        try {
            const [startHour, startMinute] = booking.startTime.split(':').map(Number);
            const [endHour, endMinute] = booking.endTime.split(':').map(Number);

            const startOffset = (startHour - START_HOUR) + (startMinute / 60);
            const endOffset = (endHour - START_HOUR) + (endMinute / 60);
            
            const left = `${(startOffset / totalHours) * 100}%`;
            const width = `${((endOffset - startOffset) / totalHours) * 100}%`;
            
            return { left, width };
        } catch (e) {
            console.error("Error calculating booking position:", e);
            return { left: '0%', width: '0%' };
        }
    };

    return (
        <div className="relative h-full border rounded-lg shadow-sm">
            <div className="absolute inset-0 overflow-x-auto">
                <div 
                    className="grid relative bg-background"
                    style={{
                        gridTemplateColumns: `180px repeat(${totalHours * 4}, 20px)`, // Using fixed width for columns
                        gridTemplateRows: `40px repeat(${aircraft.length}, minmax(60px, 1fr))`,
                    }}
                >
                    {/* Corner Cell */}
                    <div className="sticky top-0 left-0 z-30 bg-muted border-b border-r p-2 font-semibold text-sm flex items-center">
                        Aircraft
                    </div>
                    
                    {/* Header Cells */}
                    {hours.map(hour => (
                        <div 
                            key={hour}
                            className="sticky top-0 z-20 bg-muted border-b border-r text-center font-semibold text-xs text-muted-foreground p-2"
                            style={{ gridColumn: `${2 + (hour - START_HOUR) * 4} / span 4` }}
                        >
                            {format(new Date(0,0,0,hour), 'HH:mm')}
                        </div>
                    ))}

                    {/* Aircraft & Booking Rows */}
                    {aircraft.map((ac, rowIndex) => (
                        <React.Fragment key={ac.id}>
                            {/* Aircraft Column */}
                            <div className="sticky left-0 z-10 bg-background border-b border-r p-2 font-medium text-sm flex items-center">
                                <div>
                                    <p>{ac.tailNumber}</p>
                                    <p className="text-xs text-muted-foreground">{ac.model}</p>
                                </div>
                            </div>
                            
                            {/* Grid Cells & Bookings */}
                            <div
                                className="col-start-2 relative"
                                style={{ gridRow: `${rowIndex + 2}`, gridColumn: '2 / -1' }}
                            >
                                {/* Background Grid Lines & Clickable Cells */}
                                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalHours}, minmax(0, 1fr))`}}>
                                    {hours.map((hour, hourIndex) => (
                                        <div key={hourIndex} className="border-r h-full relative group" >
                                             <div 
                                                className="absolute inset-0 hover:bg-muted/50 cursor-pointer"
                                                onClick={() => canEdit && onNewBooking(ac, `${String(hour).padStart(2, '0')}:00`)}
                                             />
                                             <div className="h-full border-r border-dashed" style={{left: '25%'}}></div>
                                             <div className="h-full border-r border-dashed" style={{left: '50%'}}></div>
                                             <div className="h-full border-r border-dashed" style={{left: '75%'}}></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute inset-0 border-b"></div>


                                {/* Bookings */}
                                {dayBookings.filter(b => b.aircraft === ac.tailNumber).map(booking => {
                                    const { left, width } = getBookingPosition(booking);
                                    return (
                                        <TooltipProvider key={booking.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div
                                                        className={cn("absolute top-1/2 -translate-y-1/2 h-4/6 rounded-md text-white text-xs font-semibold flex items-center px-2 overflow-hidden cursor-pointer z-10", getBookingColor(booking, aircraft))}
                                                        style={{ left, width }}
                                                    >
                                                        <p className="truncate">{booking.purpose}: {booking.student || booking.instructor || booking.maintenanceType}</p>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-bold">{booking.aircraft} ({booking.purpose})</p>
                                                    <p>{booking.startTime} - {booking.endTime}</p>
                                                    {booking.student && <p>Student: {booking.student}</p>}
                                                    {booking.instructor && <p>Instructor: {booking.instructor}</p>}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )
                                })}
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
