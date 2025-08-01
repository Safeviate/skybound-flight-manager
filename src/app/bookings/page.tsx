
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartView } from './gantt-chart-view';
import { useState, useEffect } from 'react';
import type { Aircraft, Booking } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

function BookingsPage() {
  const { company } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
        const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
        
        const [bookingsSnapshot, aircraftSnapshot] = await Promise.all([
          getDocs(bookingsQuery),
          getDocs(aircraftQuery)
        ]);

        const bookingsData = bookingsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
        const aircraftData = aircraftSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Aircraft));
        
        // Mock data for demonstration if Firestore is empty
        if (bookingsData.length === 0 && aircraftData.length > 0) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            bookingsData.push(
                { id: 'booking1', companyId: company.id, aircraft: aircraftData[0].tailNumber, date: todayStr, startTime: '09:00', endTime: '11:00', purpose: 'Training', student: 'John Doe', status: 'Approved' },
                { id: 'booking2', companyId: company.id, aircraft: aircraftData[1].tailNumber, date: todayStr, startTime: '12:00', endTime: '13:30', purpose: 'Private', student: 'Jane Smith', status: 'Approved' },
                { id: 'booking3', companyId: company.id, aircraft: aircraftData[0].tailNumber, date: todayStr, startTime: '14:00', endTime: '16:00', purpose: 'Maintenance', student: '', status: 'Approved' }
            );
        }

        setBookings(bookingsData);
        setAircraft(aircraftData);

      } catch (error) {
        console.error("Error fetching booking data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company]);


  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Bookings</CardTitle>
          <CardDescription>
            A Gantt chart view of aircraft reservations for the selected day.
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
