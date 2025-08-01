
'use client';

import * as React from 'react';
import { format, parse } from 'date-fns';
import type { Aircraft, Booking } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plane } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// Utility to convert time string (HH:mm) to minutes from midnight
const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'bg-blue-500';
        case 'Maintenance': return 'bg-red-500';
        case 'Private': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
}

export function GanttChartView({
  aircraft,
  bookings,
}: {
  aircraft: Aircraft[];
  bookings: Booking[];
}) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayBookings = bookings.filter(b => b.date === todayStr);

  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative overflow-x-auto border rounded-lg">
      <div className="grid min-w-[1200px]" style={{ gridTemplateColumns: '150px 1fr' }}>
        
        {/* Sticky Header: Aircraft */}
        <div className="sticky left-0 z-20 p-2 border-b border-r bg-muted font-semibold flex items-center">
            Aircraft
        </div>
        
        {/* Scrollable Header: Hours */}
        <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
          {HOURS.map((hour) => (
            <div key={hour} className="text-center p-2 border-r text-xs font-medium text-muted-foreground bg-muted">
              {hour}
            </div>
          ))}
        </div>

        {/* Sticky Column: Aircraft List */}
        <div className="sticky left-0 z-10 grid">
          {aircraft.map((ac) => (
            <div
              key={ac.id}
              className="flex items-center gap-2 p-2 border-b border-r bg-muted"
            >
              <Plane className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium truncate">{ac.tailNumber}</span>
            </div>
          ))}
        </div>

        {/* Scrollable Content: Bookings */}
        <div className="relative grid" style={{ gridTemplateRows: `repeat(${aircraft.length}, auto)` }}>
            {/* Background Grid Lines */}
            <div className="absolute inset-0 grid h-full" style={{ gridTemplateColumns: `repeat(${HOURS.length}, 1fr)` }}>
                {HOURS.map((_, index) => (
                <div key={index} className="border-r border-dashed" />
                ))}
            </div>

            {aircraft.map((ac, rowIndex) => (
                <div key={ac.id} className="relative h-14 border-b">
                {todayBookings
                    .filter((booking) => booking.aircraft === ac.tailNumber)
                    .map((booking) => {
                    const startMinutes = timeToMinutes(booking.startTime);
                    const endMinutes = timeToMinutes(booking.endTime);
                    const durationMinutes = endMinutes - startMinutes;

                    const left = (startMinutes / (24 * 60)) * 100;
                    const width = (durationMinutes / (24 * 60)) * 100;

                    return (
                        <div
                        key={booking.id}
                        className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-10 rounded-lg p-2 text-white shadow-md flex items-center",
                            getBookingColor(booking.purpose)
                        )}
                        style={{
                            left: `${left}%`,
                            width: `${width}%`,
                        }}
                        >
                            <div className="truncate text-xs">
                                <p className="font-semibold">{booking.purpose}</p>
                                <p>{booking.student || 'N/A'}</p>
                            </div>
                        </div>
                    );
                    })}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}
