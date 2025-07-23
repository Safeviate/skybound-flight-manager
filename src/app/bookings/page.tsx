
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useState, useEffect } from 'react';
import type { Booking } from '@/lib/types';
import { bookingData as initialBookingData } from '@/lib/data-provider';
import { BookingCalendar } from './booking-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthlyCalendarView } from './monthly-calendar-view';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

function BookingsPage() {
  const [bookingData, setBookingData] = useState<Booking[]>(initialBookingData);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const handleBookingCreated = (newBooking: Omit<Booking, 'id'>) => {
      const bookingWithId: Booking = {
          ...newBooking,
          id: `booking-${Date.now()}`
      };
      setBookingData(prev => [...prev, bookingWithId]);
      setIsNewBookingOpen(false);
  }

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule</CardTitle>
            <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
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
            <Tabs defaultValue="day">
                <TabsList>
                    <TabsTrigger value="day">Day View</TabsTrigger>
                    <TabsTrigger value="month">Month View</TabsTrigger>
                </TabsList>
                <TabsContent value="day" className="mt-4">
                    <BookingCalendar />
                </TabsContent>
                <TabsContent value="month" className="mt-4">
                    <MonthlyCalendarView bookings={bookingData} />
                </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
  );
}

BookingsPage.title = 'Aircraft Bookings';
export default BookingsPage;
