
'use client';

import React from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';

const HOURS_IN_DAY = 24;
const HOUR_COLUMN_WIDTH_PX = 96;
const TOTAL_WIDTH_PX = HOURS_IN_DAY * HOUR_COLUMN_WIDTH_PX;

const timeToPosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * TOTAL_WIDTH_PX;
};

const getBookingVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500 border-blue-700';
      case 'Maintenance': return 'bg-red-500 border-red-700';
      case 'Private': return 'bg-green-500 border-green-700';
      default: return 'bg-gray-500 border-gray-700';
    }
}

interface GanttTimelineProps {
    currentDate: Date;
    bookings: Booking[];
    aircraft: Aircraft[];
}

export function GanttTimeline({ currentDate, bookings, aircraft }: GanttTimelineProps) {
  const dateString = format(currentDate, 'yyyy-MM-dd');

  return (
    <div className="relative" style={{ minWidth: `${TOTAL_WIDTH_PX}px` }}>
      {/* Grid lines */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: HOURS_IN_DAY }).map((_, i) => (
          <div key={i} className="border-r" style={{ width: `${HOUR_COLUMN_WIDTH_PX}px` }}></div>
        ))}
      </div>

      {/* Booking rows */}
      <div className="relative">
        {aircraft.map(ac => {
          const todaysBookings = bookings.filter(b => b.aircraft === ac.tailNumber && b.date === dateString);
          
          return (
            <div key={ac.id} className="h-20 border-b relative">
              {todaysBookings.map(booking => {
                const left = timeToPosition(booking.startTime);
                const right = timeToPosition(booking.endTime);
                const width = right - left;

                return (
                  <div
                    key={booking.id}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 h-14 rounded-lg p-2 text-white shadow-md overflow-hidden",
                      getBookingVariant(booking.purpose)
                    )}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    <p className="font-bold text-sm truncate">{booking.purpose}</p>
                    <p className="text-xs truncate">{booking.instructor !== 'N/A' ? booking.instructor : booking.student}</p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  );
}
