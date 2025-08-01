
'use client';

import { isSameDay, parse, setHours } from 'date-fns';
import type { Booking, Aircraft } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';


interface GanttChartViewProps {
  currentDate: Date;
  bookings: Booking[];
  aircraft: Aircraft[];
}

const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

export function GanttChartView({ currentDate, bookings, aircraft }: GanttChartViewProps) {
  const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500/80 border-blue-700';
      case 'Maintenance': return 'bg-yellow-500/80 border-yellow-700';
      case 'Private': return 'bg-green-500/80 border-green-700';
      default: return 'bg-gray-500/80 border-gray-700';
    }
  };

  const dayBookings = bookings.filter((b) => isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), currentDate));
  
  const totalMinutesInView = 18 * 60; // 18 hours from 6:00 to 24:00

  return (
    <div className="flex w-full">
        <div className="w-48 flex-shrink-0">
             <div className="h-10 flex items-center p-2 font-semibold text-sm">Aircraft</div>
             {aircraft.map((ac) => (
                <div key={ac.id} className="h-12 flex items-center p-2 border-t text-sm font-medium whitespace-nowrap">
                    {ac.model} ({ac.tailNumber})
                </div>
             ))}
        </div>
        <ScrollArea className="flex-1 whitespace-nowrap">
            <div className="relative" style={{ width: `${18 * 4}rem` }}>
                <div className="h-10 grid grid-cols-18">
                    {hours.map(hour => (
                        <div key={hour} className="w-16 flex items-center justify-center text-sm text-muted-foreground border-l">
                            {hour.toString().padStart(2, '0')}:00
                        </div>
                    ))}
                </div>
                <div className="relative">
                    {aircraft.map((ac, acIndex) => {
                        const aircraftBookings = dayBookings.filter(b => b.aircraft === ac.tailNumber);
                        return (
                             <div key={ac.id} className="relative h-12 border-t">
                                <div className="grid grid-cols-18 h-full">
                                    {hours.map(hour => <div key={hour} className="w-16 h-full border-l"></div>)}
                                </div>
                                {aircraftBookings.map(booking => {
                                    const start = parse(booking.startTime, 'HH:mm', new Date());
                                    const end = parse(booking.endTime, 'HH:mm', new Date());
                                    const startMinutes = Math.max(0, start.getHours() * 60 + start.getMinutes() - 360);
                                    const endMinutes = Math.min(totalMinutesInView, end.getHours() * 60 + end.getMinutes() - 360);

                                    if (endMinutes <= startMinutes) return null;
                                    
                                    const totalWidth = 18 * 4; // 18 hours * 4rem per hour
                                    const left = (startMinutes / totalMinutesInView) * totalWidth;
                                    const width = ((endMinutes - startMinutes) / totalMinutesInView) * totalWidth;

                                    return (
                                        <div
                                            key={booking.id}
                                            className={cn(
                                                'absolute top-1/2 -translate-y-1/2 h-10 rounded-md p-1 text-white text-xs border-l-4 truncate',
                                                getBookingColor(booking.purpose)
                                            )}
                                            style={{ left: `${left}rem`, width: `${width}rem` }}
                                        >
                                            <span className="font-semibold">{booking.student || booking.purpose}</span>
                                            <span className="ml-2 opacity-80">{booking.instructor}</span>
                                        </div>
                                    );
                                })}
                             </div>
                        )
                    })}
                     {aircraft.length === 0 && (
                        <div className="h-24 flex items-center justify-center text-muted-foreground">
                            No aircraft available to display.
                        </div>
                    )}
                </div>
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
  );
}
