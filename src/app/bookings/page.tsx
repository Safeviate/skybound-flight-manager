
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useState, useEffect } from 'react';
import type { Booking, Aircraft } from '@/lib/types';
import { BookingCalendar } from './booking-calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthlyCalendarView } from './monthly-calendar-view';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

async function getBookingsPageData(companyId: string) {
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    
    const [bookingsSnapshot, aircraftSnapshot] = await Promise.all([
        getDocs(bookingsQuery),
        getDocs(aircraftQuery)
    ]);

    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    
    return { bookingsList, aircraftList };
}

function BookingsPageContent({
    initialBookings,
    initialAircraft
}: {
    initialBookings: Booking[],
    initialAircraft: Aircraft[]
}) {
  const [bookingData, setBookingData] = useState<Booking[]>(initialBookings);
  const [aircraftData, setAircraftData] = useState<Aircraft[]>(initialAircraft);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const { user, company, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const fetchData = async () => {
    if (!company) return;
    try {
        const { bookingsList, aircraftList } = await getBookingsPageData(company.id);
        setBookingData(bookingsList);
        setAircraftData(aircraftList);

    } catch(e) {
        console.error("Error fetching booking data: ", e);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load booking data.' });
    }
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

  const handleBookingUpdated = async (updatedBooking: Booking) => {
    if (!company) return;
    try {
        const bookingRef = doc(db, `companies/${company.id}/bookings`, updatedBooking.id);
        await setDoc(bookingRef, updatedBooking);
        setBookingData(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
        setEditingBooking(null);
        setIsNewBookingOpen(false);
    } catch (error) {
        console.error("Error updating booking:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update booking.' });
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

  const openNewBookingDialog = () => {
    setEditingBooking(null);
    setIsNewBookingOpen(true);
  }

  const openEditBookingDialog = (booking: Booking) => {
    setEditingBooking(booking);
    setIsNewBookingOpen(true);
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Schedule</CardTitle>
          <Button onClick={openNewBookingDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Booking
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="day">
              <TabsList>
                  <TabsTrigger value="day">Day View</TabsTrigger>
                  <TabsTrigger value="month">Month View</TabsTrigger>
              </TabsList>
              <TabsContent value="day" className="mt-4">
                  <BookingCalendar 
                      bookings={bookingData}
                      aircraft={aircraftData}
                      onCancelBooking={handleCancelBooking}
                      onEditBooking={openEditBookingDialog} 
                  />
              </TabsContent>
              <TabsContent value="month" className="mt-4">
                  <MonthlyCalendarView bookings={bookingData} aircraftData={aircraftData} />
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{editingBooking ? 'Change Booking' : 'Create New Booking'}</DialogTitle>
                  <DialogDescription>
                      {editingBooking ? 'Update the details for this booking.' : 'Fill out the form below to schedule an aircraft.'}
                  </DialogDescription>
              </DialogHeader>
              <NewBookingForm 
                  onBookingCreated={handleBookingCreated}
                  onBookingUpdated={handleBookingUpdated}
                  existingBooking={editingBooking}
              />
          </DialogContent>
      </Dialog>
    </main>
  );
}

export default async function BookingsPageContainer() {
    const companyId = 'skybound-aero';
    const { bookingsList, aircraftList } = await getBookingsPageData(companyId);
    
    return <BookingsPageContent initialBookings={bookingsList} initialAircraft={aircraftList} />
}

BookingsPageContainer.title = 'Aircraft Bookings';
