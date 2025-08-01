
'use client';

import * as React from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
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
    selectedDay
}: {
    bookings: Booking[];
    aircraft: Aircraft[];
    selectedDay: Date;
}) {

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
        <div className="border rounded-lg shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-x-auto h-full">
                <div 
                    className="grid relative bg-background"
                    style={{
                        gridTemplateColumns: `180px repeat(${totalHours * 4}, minmax(0, 1fr))`, // 4 columns per hour (15 min increments)
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
                                {/* Background Grid Lines */}
                                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${totalHours * 4}, minmax(0, 1fr))`}}>
                                    {Array.from({ length: totalHours * 4 }).map((_, i) => (
                                        <div key={i} className={cn("border-r", (i + 1) % 4 !== 0 && "border-dashed", i === (totalHours * 4) -1 && "border-r-0")}></div>
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
                                                        className={cn("absolute top-1/2 -translate-y-1/2 h-4/6 rounded-md text-white text-xs font-semibold flex items-center px-2 overflow-hidden cursor-pointer", getBookingColor(booking.purpose))}
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
