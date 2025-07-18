'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { aircraftData, bookingData } from '@/lib/mock-data';
import type { Booking } from '@/lib/types';
import { format, parseISO, isSameDay, addDays, eachDayOfInterval, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, GanttChartSquare } from 'lucide-react';

type ViewMode = 'month' | 'gantt';

const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'default';
        case 'Maintenance': return 'destructive';
        case 'Private': return 'secondary';
        default: return 'outline';
    }
}

function MonthView() {
    const today = startOfDay(new Date('2024-08-15'));
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);

    const bookedDays = bookingData.map(b => parseISO(b.date));

    const getBookingsForDay = (day: Date | undefined) => {
        if (!day) return [];
        return bookingData
            .filter(booking => isSameDay(parseISO(booking.date), day))
            .sort((a, b) => a.time.localeCompare(b.time));
    };

    const selectedDayBookings = getBookingsForDay(selectedDay);

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
                <h3 className="text-xl font-semibold">
                    {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'No date selected'}
                </h3>
                {selectedDayBookings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Aircraft</TableHead>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Purpose</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedDayBookings.map(booking => (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.time}</TableCell>
                                    <TableCell className="font-medium">{booking.aircraft}</TableCell>
                                    <TableCell>{booking.instructor}</TableCell>
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

function GanttView() {
    const today = startOfDay(new Date('2024-08-15'));
    const weekDays = eachDayOfInterval({ start: today, end: addDays(today, 6) });

    const bookingsByAircraft: { [key: string]: Booking[] } = {};
    for (const booking of bookingData) {
        if (!bookingsByAircraft[booking.aircraft]) {
            bookingsByAircraft[booking.aircraft] = [];
        }
        bookingsByAircraft[booking.aircraft].push(booking);
    }
    
    return (
        <TooltipProvider>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="min-w-[1200px]">
                    <div className="grid sticky top-0 z-10 bg-background" style={{ gridTemplateColumns: '120px repeat(7, 1fr)'}}>
                        <div className="p-2 border-b border-r font-semibold">Aircraft</div>
                        {weekDays.map(day => (
                            <div key={day.toISOString()} className="p-2 text-center border-b">
                                <div className="font-semibold">{format(day, 'EEE')}</div>
                                <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
                            </div>
                        ))}
                    </div>
                    <div className="divide-y">
                        {aircraftData.map(aircraft => (
                            <div key={aircraft.id} className="grid" style={{ gridTemplateColumns: '120px repeat(7, 1fr)'}}>
                                <div className="p-2 border-r font-medium text-sm flex items-center">
                                    {aircraft.tailNumber}
                                </div>
                                {weekDays.map(day => {
                                    const dayBookings = (bookingsByAircraft[aircraft.tailNumber] || []).filter(b => isSameDay(parseISO(b.date), day));
                                    return (
                                        <div key={day.toISOString()} className="p-1 h-16 border-l relative">
                                            {dayBookings.map(booking => (
                                                 <Tooltip key={booking.id}>
                                                    <TooltipTrigger asChild>
                                                        <div className={`absolute p-1 rounded-md h-auto text-white text-xs overflow-hidden ${getPurposeVariant(booking.purpose) === 'destructive' ? 'bg-destructive' : 'bg-primary'}`} style={{ top: `${parseInt(booking.time.substring(0,2)) / 24 * 100}%`, height: '25%' }}>
                                                            {booking.purpose} - {booking.time}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{booking.aircraft} ({booking.purpose})</p>
                                                        <p>Time: {booking.time}</p>
                                                        <p>Instructor: {booking.instructor}</p>
                                                        <p>Student: {booking.student}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </TooltipProvider>
    );
}

export function BookingCalendar() {
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Month
                </Button>
                <Button variant={viewMode === 'gantt' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('gantt')}>
                    <GanttChartSquare className="mr-2 h-4 w-4" />
                    Gantt
                </Button>
            </div>
            {viewMode === 'month' ? <MonthView /> : <GanttView />}
        </div>
    );
}
