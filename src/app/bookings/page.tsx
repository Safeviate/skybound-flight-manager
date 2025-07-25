
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useState, useEffect } from 'react';
import type { Booking } from '@/lib/types';
import { BookingCalendar } from './booking-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthlyCalendarView } from './monthly-calendar-view';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

function BookingsPage() {
  const [bookingData, setBookingData] = useState<Booking[]>([]);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const { user, company, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (company) {
        fetchBookings();
    }
  }, [user, company, loading, router]);

  const fetchBookings = async () => {
    if (!company) return;
    const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    setBookingData(bookingsList);
  };

  const handleBookingCreated = async (newBooking: Omit<Booking, 'id'>) => {
      if (!company) {
          toast({ variant: 'destructive', title: 'Error', description: 'Cannot create booking without company context.' });
          return;
      }
      try {
        const bookingsCollection = collection(db, `companies/${company.id}/bookings`);
        const docRef = await addDoc(bookingsCollection, newBooking);
        
        setBookingData(prev => [...prev, { ...newBooking, id: docRef.id }]);
        setIsNewBookingOpen(false);
      } catch (error) {
          console.error("Error creating booking:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to save booking to database.' });
      }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!company) return;
    try {
        const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingId);
        await updateDoc(bookingRef, { status: 'Cancelled' });
        setBookingData(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
        toast({
            title: 'Booking Cancelled',
            description: 'The booking has been successfully cancelled.',
        });
    } catch (error) {
        console.error("Error cancelling booking:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to cancel booking.' });
    }
  };


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
                    <BookingCalendar bookings={bookingData} onCancelBooking={handleCancelBooking} />
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
