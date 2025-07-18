
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { aircraftData } from '@/lib/mock-data';
import type { Booking } from '@/lib/types';
import { format, parseISO, isSameDay, addDays, eachDayOfInterval, startOfDay, isPast } from 'date-fns';
import { Calendar as CalendarIcon, GanttChartSquare, BookCopy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogFlightForm } from './log-flight-form';


type ViewMode = 'month' | 'gantt';

const getPurposeVariant = (purpose: Booking['purpose']) => {
    switch (purpose) {
        case 'Training': return 'default';
        case 'Maintenance': return 'destructive';
        case 'Private': return 'secondary';
        default: return 'outline';
    }
}

interface MonthViewProps {
    bookings: Booking[];
    onFlightLogged: (bookingId: string) => void;
}

function MonthView({ bookings, onFlightLogged }: MonthViewProps) {
    const today = startOfDay(new Date('2024-08-15'));
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);
    const [dialogsOpen, setDialogsOpen] = useState<{[key: string]: boolean}>({});

    const bookedDays = bookings.map(b => parseISO(b.date));

    const getBookingsForDay = (day: Date | undefined) => {
        if (!day) return [];
        return bookings
            .filter(booking => isSameDay(parseISO(booking.date), day))
            .sort((a, b) => a.time.localeCompare(b.time));
    };

    const selectedDayBookings = getBookingsForDay(selectedDay);

    const handleFlightLoggedAndClose = (bookingId: string) => {
        onFlightLogged(bookingId);
        setDialogsOpen(prev => ({ ...prev, [bookingId]: false }));
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
                <h3 className="text-xl font-semibold">
                    {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'No date selected'}
                </h3>
                {selectedDayBookings.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Aircraft</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedDayBookings.map(booking => {
                                const logFlightButton = (
                                    <Button variant="outline" size="sm" disabled={!booking.isChecklistComplete}>
                                        <BookCopy className="mr-2 h-4 w-4" />
                                        Log Flight
                                    </Button>
                                );
                                return (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.time}</TableCell>
                                    <TableCell className="font-medium">{booking.aircraft}</TableCell>
                                    <TableCell>
                                        <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={booking.status === 'Completed' ? 'success' : 'outline'}>{booking.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {booking.purpose === 'Training' && booking.status === 'Upcoming' && isPast(parseISO(booking.date)) && (
                                            <Dialog open={dialogsOpen[booking.id]} onOpenChange={(isOpen) => setDialogsOpen(prev => ({...prev, [booking.id]: isOpen}))}>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <DialogTrigger asChild>
                                                                {logFlightButton}
                                                            </DialogTrigger>
                                                        </TooltipTrigger>
                                                        {!booking.isChecklistComplete && (
                                                            <TooltipContent>
                                                                <p>Pre-flight checklist must be completed.</p>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Log Training Flight</DialogTitle>
                                                        <DialogDescription>
                                                            Confirm flight details and add instructor notes.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <LogFlightForm booking={booking} onFlightLogged={() => handleFlightLoggedAndClose(booking.id)} />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )})}
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

interface GanttViewProps {
    bookings: Booking[];
}

function GanttView({ bookings }: GanttViewProps) {
    const today = startOfDay(new Date('2024-08-15'));
    const weekDays = eachDayOfInterval({ start: today, end: addDays(today, 6) });

    const bookingsByAircraft: { [key: string]: Booking[] } = {};
    for (const booking of bookings) {
        if (!bookingsByAircraft[booking.aircraft]) {
            bookingsByAircraft[booking.aircraft] = [];
        }
        bookingsByAircraft[booking.aircraft].push(booking);
    }
    
    return (
        <TooltipProvider>
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <div className="min-w-[1200px] relative">
                    <ScrollBar orientation="horizontal" className="absolute top-0" />
                    <div className="grid sticky top-0 z-10 bg-background pt-4" style={{ gridTemplateColumns: '120px repeat(7, 1fr)'}}>
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
                                                            {booking.purpose} - {booking.time} {booking.status === 'Completed' && <Check className="inline h-3 w-3 ml-1" />}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{booking.aircraft} ({booking.purpose})</p>
                                                        <p>Time: {booking.time}</p>
                                                        <p>Instructor: {booking.instructor}</p>
                                                        <p>Student: {booking.student}</p>
                                                        <p>Status: {booking.status}</p>
                                                        {booking.purpose === 'Training' && <p>Checklist: {booking.isChecklistComplete ? 'Complete' : 'Pending'}</p>}
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
            </ScrollArea>
        </TooltipProvider>
    );
}

interface BookingCalendarProps {
    bookings: Booking[];
    onFlightLogged: (bookingId: string) => void;
}

export function BookingCalendar({ bookings, onFlightLogged }: BookingCalendarProps) {
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
            {viewMode === 'month' ? <MonthView bookings={bookings} onFlightLogged={onFlightLogged} /> : <GanttView bookings={bookings} />}
        </div>
    );
}
