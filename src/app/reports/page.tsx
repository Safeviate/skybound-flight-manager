
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { bookingData, userData, aircraftData } from '@/lib/data-provider';
import { useMemo, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

const AircraftUtilizationChart = () => {
  const utilizationData = useMemo(() => {
    const bookingsByAircraft = bookingData.reduce((acc, booking) => {
      const aircraft = aircraftData.find(ac => ac.tailNumber === booking.aircraft);
      if (aircraft) {
        acc[aircraft.model] = (acc[aircraft.model] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(bookingsByAircraft).map(([name, bookings]) => ({
      name,
      bookings,
    }));
  }, []);

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

export default function ReportsPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Flight Statistics" />
            <div className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Flight Statistics" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Operational Metrics</CardTitle>
            <CardDescription>Insights into aircraft usage and flight activity across the fleet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <h3 className="text-lg font-semibold text-center mb-4">Aircraft Utilization by Bookings</h3>
              <AircraftUtilizationChart />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
