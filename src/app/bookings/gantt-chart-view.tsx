
'use client';

import { isSameDay, parse, setHours } from 'date-fns';
import type { Booking, Aircraft } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface GanttChartViewProps {
  currentDate: Date;
  bookings: Booking[];
  aircraft: Aircraft[];
}

const hours = Array.from({ length: 24 }, (_, i) => i);

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

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <table className="min-w-full border-separate" style={{ borderSpacing: '0 4px' }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-32 bg-background py-2 pr-2 text-left text-sm font-semibold">
                Aircraft
              </th>
              {hours.map((hour) => (
                <th key={hour} className="w-16 border-l pl-1 pr-2 text-center text-sm font-normal text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aircraft.map((ac) => {
              const aircraftBookings = dayBookings.filter((b) => b.aircraft === ac.tailNumber);
              return (
                <tr key={ac.id}>
                  <td className="sticky left-0 z-10 w-32 whitespace-nowrap bg-background py-2 pr-2 text-sm font-medium">
                    {ac.make} {ac.model} ({ac.tailNumber})
                  </td>
                  <td colSpan={24} className="relative p-0">
                    <div className="relative h-10 border-t border-b">
                      {hours.map((hour) => (
                        <div key={hour} className="absolute h-full border-l" style={{ left: `${(hour / 24) * 100}%` }}></div>
                      ))}
                      {aircraftBookings.map((booking) => {
                        const start = parse(booking.startTime, 'HH:mm', new Date());
                        const end = parse(booking.endTime, 'HH:mm', new Date());
                        const startMinutes = start.getHours() * 60 + start.getMinutes();
                        const endMinutes = end.getHours() * 60 + end.getMinutes();

                        const left = (startMinutes / (24 * 60)) * 100;
                        const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;

                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              'absolute h-full rounded-md p-1 text-white text-xs border-l-4 truncate',
                              getBookingColor(booking.purpose)
                            )}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            <span className="font-semibold">{booking.student || booking.purpose}</span>
                            <span className="ml-2 opacity-80">{booking.instructor}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
             {aircraft.length === 0 && (
                <tr>
                    <td colSpan={25} className="py-10 text-center text-muted-foreground">
                        No aircraft available to display.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
