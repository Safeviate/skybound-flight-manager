
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { BookingCalendar } from './booking-calendar';
import { bookingData as initialBookingData, aircraftData as initialAircraftData } from '@/lib/mock-data';
import type { Booking, Aircraft } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export default function BookingsPage() {
  const [bookingData, setBookingData] = useState<Booking[]>(initialBookingData);
  const [fleet, setFleet] = useState<Aircraft[]>(initialAircraftData);
  const { toast } = useToast();
  
  const handleBookingUpdate = (updatedBooking: Booking) => {
    setBookingData(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
  };

  const handleFlightLogged = (bookingId: string) => {
    setBookingData(prevData => prevData.map(b => b.id === bookingId ? { ...b, status: 'Completed' } : b));
  };
  
  const handleApproveBooking = (bookingId: string) => {
      const booking = bookingData.find(b => b.id === bookingId);
      if (!booking) return;

      setBookingData(prevData => prevData.map(b => b.id === bookingId ? { ...b, status: 'Approved' } : b));

      // Mark aircraft as having a pending post-flight check
      setFleet(prevFleet => 
          prevFleet.map(ac => 
              ac.tailNumber === booking.aircraft ? { ...ac, isPostFlightPending: true } : ac
          )
      );

      toast({
        title: "Booking Approved",
        description: `Booking for ${booking.aircraft} has been approved.`
      });
  };

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
            <BookingCalendar 
                bookings={bookingData} 
                fleet={fleet}
                onFlightLogged={handleFlightLogged}
                onApproveBooking={handleApproveBooking}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
