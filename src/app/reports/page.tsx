
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo, useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Booking, Aircraft } from '@/lib/types';


const AircraftUtilizationChart = ({ bookings, aircraft }: { bookings: Booking[], aircraft: Aircraft[] }) => {
  const utilizationData = useMemo(() => {
    const bookingsByAircraft = bookings.reduce((acc, booking) => {
      const ac = aircraft.find(a => a.tailNumber === booking.aircraft);
      if (ac) {
        acc[ac.model] = (acc[ac.model] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(bookingsByAircraft).map(([name, numBookings]) => ({
      name,
      bookings: numBookings,
    }));
  }, [bookings, aircraft]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={utilizationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        <Legend />
        <Bar dataKey="bookings" name="Total Bookings" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
};

function ReportsPage() {
  const { user, company, loading } = useUser();
  const router = useRouter();
  const [bookingData, setBookingData] = useState<Booking[]>([]);
  const [aircraftData, setAircraftData] = useState<Aircraft[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
      if (!company) return;

      const fetchData = async () => {
          setDataLoading(true);
          try {
              const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
              const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
              
              const [bookingsSnapshot, aircraftSnapshot] = await Promise.all([
                  getDocs(bookingsQuery),
                  getDocs(aircraftQuery)
              ]);

              setBookingData(bookingsSnapshot.docs.map(doc => doc.data() as Booking));
              setAircraftData(aircraftSnapshot.docs.map(doc => doc.data() as Aircraft));
          } catch (error) {
              console.error("Error fetching report data:", error);
          } finally {
              setDataLoading(false);
          }
      };

      fetchData();
  }, [company]);


  if (loading || dataLoading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Operational Metrics</CardTitle>
          <CardDescription>Insights into aircraft usage and flight activity across the fleet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="text-lg font-semibold text-center mb-4">Aircraft Utilization by Bookings</h3>
            <AircraftUtilizationChart bookings={bookingData} aircraft={aircraftData} />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

ReportsPage.title = 'Flight Statistics';
export default ReportsPage;
