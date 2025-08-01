
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartView } from './gantt-chart-view';
import { useState, useEffect } from 'react';
import type { Aircraft, Booking } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { getBookingsPageData } from './data';

function BookingsPage() {
  const { company } = useUser();
  const [loading, setLoading] = useState(true);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!company) return;

    const fetchData = async () => {
        setLoading(true);
        const { aircraftList, bookingsList } = await getBookingsPageData(company.id);
        setAircraft(aircraftList);
        setBookings(bookingsList);
        setLoading(false);
    };

    fetchData();
  }, [company]);


  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Bookings</CardTitle>
          <CardDescription>
            View and manage aircraft reservations using the Gantt chart below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          ) : (
            <GanttChartView aircraft={aircraft} bookings={bookings} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
