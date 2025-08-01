
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarView } from './calendar-view';
import { bookingData, aircraftData } from '@/app/bookings/data';

function BookingsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Bookings</CardTitle>
          <CardDescription>
            View and manage aircraft reservations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarView bookings={bookingData} aircraft={aircraftData} />
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
