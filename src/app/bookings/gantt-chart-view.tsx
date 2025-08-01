
'use client';

import * as React from 'react';
import type { Aircraft, Booking } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parse } from 'date-fns';

interface GanttChartViewProps {
  aircraft: Aircraft[];
  bookings: Booking[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours

// Calculate the position and width of a booking bar
const getBookingStyle = (booking: Booking): React.CSSProperties => {
  const startTime = parse(booking.startTime, 'HH:mm', new Date());
  const endTime = parse(booking.endTime, 'HH:mm', new Date());

  const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
  const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
  
  const durationMinutes = endMinutes - startMinutes;
  
  const left = (startMinutes / (24 * 60)) * 100;
  const width = (durationMinutes / (24 * 60)) * 100;

  return {
    left: `${left}%`,
    width: `${width}%`,
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    height: '60%',
  };
};

const getBookingColor = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'bg-blue-500';
        case 'Maintenance': return 'bg-yellow-500';
        case 'Private': return 'bg-purple-500';
        default: return 'bg-gray-500';
    }
}


export function GanttChartView({ aircraft, bookings }: GanttChartViewProps) {
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const filteredBookings = bookings.filter(
    (b) => format(parse(b.date, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  return (
    <div className="relative w-full overflow-x-auto border rounded-lg">
      <Table className="min-w-[1600px] border-collapse">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-48 sticky left-0 bg-muted font-semibold z-10 border-r">
              Aircraft
            </TableHead>
            {HOURS.map((hour) => (
              <TableHead key={hour} className="text-center border-l w-28">
                {`${String(hour).padStart(2, '0')}:00`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {aircraft.length > 0 ? (
            aircraft.map((ac) => {
              const aircraftBookings = filteredBookings.filter(b => b.aircraft === ac.tailNumber);
              return (
                <TableRow key={ac.id} className="h-16">
                  <TableCell className="sticky left-0 bg-background z-10 font-medium border-r">
                    <div className="font-bold">{ac.tailNumber}</div>
                    <div className="text-xs text-muted-foreground">{ac.model}</div>
                  </TableCell>
                  <TableCell colSpan={24} className="p-0 border-l">
                    <div className="relative h-full w-full">
                        {/* Background grid lines for hours */}
                        <div className="absolute inset-0 flex">
                            {HOURS.map(hour => (
                                <div key={`grid-${hour}`} className="w-[calc(100%/12)] md:w-[calc(100%/24)] border-r last:border-r-0 h-full"></div>
                            ))}
                        </div>
                        {/* Bookings */}
                        {aircraftBookings.map(booking => (
                            <div key={booking.id} style={getBookingStyle(booking)} className={cn('rounded-md p-1 overflow-hidden', getBookingColor(booking.purpose))}>
                              <div className="text-xs font-semibold text-white truncate">
                                {booking.purpose} - {booking.student || booking.instructor || 'Private'}
                              </div>
                            </div>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
             <TableRow>
                <TableCell colSpan={25} className="h-40 text-center text-muted-foreground">
                    No aircraft available to display.
                </TableCell>
             </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
