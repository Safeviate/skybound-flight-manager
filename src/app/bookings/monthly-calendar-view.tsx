
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Booking, Aircraft } from '@/lib/types';
import { format, parseISO, isSameDay } from 'date-fns';
import { CalendarIcon, Plane } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';

interface MonthlyCalendarViewProps {
  bookings: Booking[];
}

export function MonthlyCalendarView({ bookings }: MonthlyCalendarViewProps) {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [selectedAircraft, setSelectedAircraft] = useState<string>('all');
  const [aircraftData, setAircraftData] = useState<Aircraft[]>([]);
  const { company } = useUser();

  useEffect(() => {
    if (!company) return;
    const fetchAircraft = async () => {
        const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
        const snapshot = await getDocs(aircraftQuery);
        setAircraftData(snapshot.docs.map(doc => doc.data() as Aircraft));
    };
    fetchAircraft();
  }, [company]);

  const filteredBookings = useMemo(() => {
    if (selectedAircraft === 'all') {
      return bookings;
    }
    const aircraft = aircraftData.find(a => a.id === selectedAircraft);
    if (!aircraft) return bookings;
    return bookings.filter(b => b.aircraft === aircraft.tailNumber);
  }, [bookings, selectedAircraft, aircraftData]);


  const bookedDays = useMemo(() => {
    return filteredBookings.map(b => parseISO(b.date));
  }, [filteredBookings]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return filteredBookings
      .filter(booking => isSameDay(parseISO(booking.date), selectedDay))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredBookings, selectedDay]);

  const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
      case 'Training': return 'default';
      case 'Maintenance': return 'destructive';
      case 'Private': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
       <div className="max-w-xs">
          <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
            <SelectTrigger>
                <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    <SelectValue placeholder="Select aircraft" />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Aircraft</SelectItem>
                {aircraftData.map(ac => (
                    <SelectItem key={ac.id} value={ac.id}>{ac.model} ({ac.tailNumber})</SelectItem>
                ))}
            </SelectContent>
          </Select>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            className="rounded-md border"
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
    </div>
  );
}
