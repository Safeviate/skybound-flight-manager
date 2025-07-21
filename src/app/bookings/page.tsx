
'use client';

import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useState } from 'react';
import type { Booking } from '@/lib/types';
import { bookingData as initialBookingData } from '@/lib/mock-data';
import { BookingCalendar } from './booking-calendar';

export default function BookingsPage() {
  const [bookingData, setBookingData] = useState<Booking[]>(initialBookingData);

  const handleBookingCreated = (newBooking: Omit<Booking, 'id'>) => {
      const bookingWithId: Booking = {
          ...newBooking,
          id: `booking-${Date.now()}`
      };
      setBookingData(prev => [...prev, bookingWithId]);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Aircraft Bookings" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule</CardTitle>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Booking
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create New Booking</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to schedule an aircraft.
                        </DialogDescription>
                    </DialogHeader>
                    <NewBookingForm onBookingCreated={handleBookingCreated}/>
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <BookingCalendar bookings={bookingData} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
