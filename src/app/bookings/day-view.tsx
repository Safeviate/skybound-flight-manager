
'use client';

import { format, isSameDay, isToday, parse } from 'date-fns';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DayViewProps {
  currentDate: Date;
  bookings: Booking[];
}

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export function DayView({ currentDate, bookings }: DayViewProps) {
  
  const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500/80 border-blue-700';
      case 'Maintenance': return 'bg-yellow-500/80 border-yellow-700';
      case 'Private': return 'bg-green-500/80 border-green-700';
      default: return 'bg-gray-500/80 border-gray-700';
    }
  }
  
  return (
    <div className="flex h-full">
      {/* Time column */}
      <div className="w-16 text-center text-xs">
        {hours.map((hour) => (
          <div key={hour} className="h-12 border-b pt-1 text-muted-foreground">
            {hour}
          </div>
        ))}
      </div>

      {/* Events column */}
      <div className="flex-1 border-l">
        <div className="relative">
          {/* Hour lines */}
          {hours.map((hour) => (
            <div key={hour} className="h-12 border-b"></div>
          ))}

          {/* Bookings for this day */}
          {bookings
            .filter((b) => isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), currentDate))
            .map((booking) => {
              const startHour = parseInt(booking.startTime.split(':')[0]);
              const startMinute = parseInt(booking.startTime.split(':')[1]);
              const endHour = parseInt(booking.endTime.split(':')[0]);
              const endMinute = parseInt(booking.endTime.split(':')[1]);

              const top = (startHour + startMinute / 60) * 48; // 48px per hour
              const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 48;

              return (
                <div
                  key={booking.id}
                  className={cn(
                    'absolute w-11/12 ml-2 p-2 rounded-lg text-white text-sm border-l-4 z-10',
                    getBookingColor(booking.purpose)
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  <p className="font-bold">{booking.aircraft}</p>
                  <p className="text-xs">{booking.student || booking.purpose}</p>
                   <p className="text-xs">{booking.instructor}</p>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
