
'use client';

import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parse,
  startOfWeek,
} from 'date-fns';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  bookings: Booking[];
}

const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

export function WeekView({ currentDate, bookings }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

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
        <div className="h-10 border-b"></div> {/* Empty corner */}
        {hours.map((hour) => (
          <div key={hour} className="h-12 border-b pt-1 text-muted-foreground">
            {hour}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="grid flex-1 grid-cols-7">
        {days.map((day) => (
          <div key={day.toString()} className="border-l">
            <div className="sticky top-0 z-10 bg-background text-center text-sm font-semibold border-b h-10 flex flex-col justify-center">
              <span className="text-xs text-muted-foreground">{format(day, 'E')}</span>
              <span className={cn('text-lg', isToday(day) && 'text-primary')}>{format(day, 'd')}</span>
            </div>
            <div className="relative">
              {/* Hour lines */}
              {hours.map((hour) => (
                <div key={hour} className="h-12 border-b"></div>
              ))}
              {/* Bookings for this day */}
              {bookings
                .filter((b) => isSameDay(parse(b.date, 'yyyy-MM-dd', new Date()), day))
                .map((booking) => {
                  const startHour = parseInt(booking.startTime.split(':')[0]);
                  const startMinute = parseInt(booking.startTime.split(':')[1]);
                  const endHour = parseInt(booking.endTime.split(':')[0]);
                  const endMinute = parseInt(booking.endTime.split(':')[1]);

                  const top = (startHour + startMinute / 60) * 48; // 48px per hour (12 * 4)
                  const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 48;

                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        'absolute w-full p-1 rounded-md text-white text-xs border-l-4 z-10',
                        getBookingColor(booking.purpose)
                      )}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <p className="font-semibold">{booking.aircraft}</p>
                      <p className="truncate">{booking.student || booking.purpose}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
