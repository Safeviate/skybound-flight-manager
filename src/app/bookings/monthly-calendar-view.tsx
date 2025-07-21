
'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Booking } from '@/lib/types';
import { format, parseISO, isSameDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { aircraftData } from '@/lib/mock-data';

interface MonthlyCalendarViewProps {
  bookings: Booking[];
}

export function MonthlyCalendarView({ bookings }: MonthlyCalendarViewProps) {
  const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);

  const bookedDays = useMemo(() => {
    return bookings.map(b => parseISO(b.date));
  }, [bookings]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookings
      .filter(booking => isSameDay(parseISO(booking.date), selectedDay))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [bookings, selectedDay]);

  const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'default';
      case 'Maintenance': return 'destructive';
      case 'Private': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          className="rounded-md border"
          defaultMonth={today}
          modifiers={{ booked: bookedDays }}
          modifiersClassNames={{
            booked: 'bg-primary/20 text-primary-foreground rounded-full',
          }}
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6"/>
            <h3 className="text-xl font-semibold">
                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'No date selected'}
            </h3>
        </div>
        {selectedDayBookings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Aircraft</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDayBookings.map(booking => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                  <TableCell className="font-medium">{booking.aircraft}</TableCell>
                  <TableCell>{booking.instructor !== 'N/A' ? booking.instructor : booking.student}</TableCell>
                  <TableCell>
                    <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              {selectedDay ? "No bookings for this day." : "Select a day to see bookings."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
