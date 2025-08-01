
'use client';

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Booking } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  currentDate: Date;
  bookings: Booking[];
}

export function MonthView({ currentDate, bookings }: MonthViewProps) {
  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(firstDayOfMonth),
    end: endOfWeek(lastDayOfMonth),
  });

  const getBookingsForDay = (day: Date) => {
    return bookings
      .filter((booking) => isSameDay(parseISO(booking.date), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };
  
  const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'bg-blue-500/80';
      case 'Maintenance': return 'bg-yellow-500/80';
      case 'Private': return 'bg-green-500/80';
      default: return 'bg-gray-500/80';
    }
  }

  return (
    <div className="grid grid-cols-7 border-t border-l">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="p-2 text-center text-sm font-semibold border-b border-r">
          {day}
        </div>
      ))}
      {daysInMonth.map((day) => {
        const dayBookings = getBookingsForDay(day);
        return (
          <div
            key={day.toString()}
            className={cn(
              'min-h-[120px] border-b border-r p-1',
              !isSameMonth(day, currentDate) && 'bg-muted/50 text-muted-foreground'
            )}
          >
            <time
              dateTime={format(day, 'yyyy-MM-dd')}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                isToday(day) && 'bg-primary text-primary-foreground'
              )}
            >
              {format(day, 'd')}
            </time>
            <div className="mt-1 space-y-1">
              {dayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={cn("p-1 rounded text-white text-xs truncate", getBookingColor(booking.purpose))}
                >
                  {booking.startTime} {booking.aircraft}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
