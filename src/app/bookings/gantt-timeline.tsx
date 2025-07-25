
'use client';

import React from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO, isSameDay } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

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
    onCancelBooking: (bookingId: string) => void;
}

export function GanttTimeline({ currentDate, bookings, aircraft, onCancelBooking }: GanttTimelineProps) {
  
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
          const todaysBookings = bookings.filter(b => {
              if (b.aircraft !== ac.tailNumber || b.status === 'Cancelled') return false;

              if (b.endDate) { // It's a multi-day booking (likely maintenance)
                const start = parseISO(b.date);
                const end = parseISO(b.endDate);
                return isSameDay(currentDate, start) || isSameDay(currentDate, end) || (currentDate > start && currentDate < end);
              } else { // It's a single day booking
                return isSameDay(parseISO(b.date), currentDate);
              }
          });
          
          return (
            <div key={ac.id} className="h-20 border-b relative">
              {todaysBookings.map(booking => {
                let left = 0;
                let width = TOTAL_WIDTH_PX;

                if (booking.purpose !== 'Maintenance') {
                    left = timeToPosition(booking.startTime);
                    const right = timeToPosition(booking.endTime);
                    width = right - left;
                } else {
                    const start = parseISO(booking.date);
                    const end = booking.endDate ? parseISO(booking.endDate) : start;

                    if (isSameDay(currentDate, start) && !isSameDay(currentDate, end)) {
                        left = timeToPosition(booking.startTime);
                        width = TOTAL_WIDTH_PX - left;
                    } else if (!isSameDay(currentDate, start) && isSameDay(currentDate, end)) {
                        left = 0;
                        width = timeToPosition(booking.endTime);
                    } else if (isSameDay(currentDate, start) && isSameDay(currentDate, end)) {
                        left = timeToPosition(booking.startTime);
                        width = timeToPosition(booking.endTime) - left;
                    }
                }

                const getBookingTitle = () => {
                    switch(booking.purpose) {
                        case 'Maintenance':
                            return booking.maintenanceType;
                        case 'Private':
                            return booking.trainingExercise; // Re-used for private flight type
                        case 'Training':
                            return booking.trainingExercise;
                        default:
                            return booking.purpose;
                    }
                }

                const getPersonnelInfo = () => {
                     switch(booking.purpose) {
                        case 'Maintenance':
                            return `Lead: ${booking.instructor}`; // Or whoever is assigned
                        case 'Private':
                            return booking.student; // This holds "PIC: User Name"
                        case 'Training':
                            return `${booking.instructor} / ${booking.student}`;
                        default:
                            return 'N/A';
                    }
                }

                return (
                  <Dialog key={booking.id}>
                    <DialogTrigger asChild>
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-14 rounded-lg p-2 text-white shadow-md overflow-hidden cursor-pointer",
                          getBookingVariant(booking.purpose)
                        )}
                        style={{ left: `${left}px`, width: `${width}px` }}
                      >
                        <p className="font-bold text-sm truncate">{getBookingTitle()}</p>
                        <p className="text-xs truncate">
                           {getPersonnelInfo()}
                        </p>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Booking Details</DialogTitle>
                            <DialogDescription>
                                {booking.purpose} booking for {booking.aircraft}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4 text-sm">
                            <div className="grid grid-cols-2 items-center gap-4">
                                <span className="text-muted-foreground">Aircraft:</span>
                                <span>{booking.aircraft}</span>
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                                <span className="text-muted-foreground">Purpose:</span>
                                <span>{booking.purpose} {booking.trainingExercise ? `(${booking.trainingExercise})` : ''}</span>
                            </div>
                             {booking.purpose === 'Maintenance' && (
                                <div className="grid grid-cols-2 items-center gap-4">
                                    <span className="text-muted-foreground">Type:</span>
                                    <span>{booking.maintenanceType}</span>
                                </div>
                            )}
                            <div className="grid grid-cols-2 items-center gap-4">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{booking.endDate ? `${format(parseISO(booking.date), 'PPP')} to ${format(parseISO(booking.endDate), 'PPP')}` : format(parseISO(booking.date), 'PPP')}</span>
                            </div>
                           {booking.purpose !== 'Maintenance' && (
                             <div className="grid grid-cols-2 items-center gap-4">
                                <span className="text-muted-foreground">Time:</span>
                                <span>{booking.startTime} - {booking.endTime}</span>
                            </div>
                           )}
                            <div className="grid grid-cols-2 items-center gap-4">
                                <span className="text-muted-foreground">Personnel:</span>
                                <span>{getPersonnelInfo()}</span>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline">Change Booking</Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive">Cancel Booking</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently cancel the booking.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Close</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onCancelBooking(booking.id)}>
                                            Yes, Cancel Booking
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  );
}
