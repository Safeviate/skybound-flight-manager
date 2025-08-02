
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useMemo, useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import type { Booking, Aircraft } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';


const AircraftUtilizationChart = ({ bookings, aircraft }: { bookings: Booking[], aircraft: Aircraft[] }) => {
  const utilizationData = useMemo(() => {
    const bookingsByAircraft = bookings.reduce((acc, booking) => {
      const ac = aircraft.find(a => a.tailNumber === booking.aircraft);
      if (ac && booking.status !== 'Cancelled') {
        const duration = booking.flightDuration || 0;
        acc[ac.model] = (acc[ac.model] || 0) + duration;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(bookingsByAircraft).map(([name, hours]) => ({
      name,
      'Flight Hours': parseFloat(hours.toFixed(1)),
    }));
  }, [bookings, aircraft]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={utilizationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" unit="h" />
        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          }}
          formatter={(value) => `${value} hrs`}
        />
        <Legend />
        <Bar dataKey="Flight Hours" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const CancellationReasonChart = ({ bookings }: { bookings: Booking[] }) => {
    const cancellationData = useMemo(() => {
        const reasons = bookings
            .filter(b => b.status === 'Cancelled' && b.cancellationReason)
            .reduce((acc, booking) => {
                const reason = booking.cancellationReason!.split(':')[0].trim();
                acc[reason] = (acc[reason] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
        
        return Object.entries(reasons).map(([name, value]) => ({ name, value }));

    }, [bookings]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={cancellationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {cancellationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                 <Tooltip />
                 <Legend />
            </PieChart>
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
  
  const recentBookings = useMemo(() => {
    return bookingData
      .filter(b => b.bookingNumber)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
      .slice(0, 10);
  }, [bookingData]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'warning';
      case 'Completed': return 'success';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  }


  if (loading || dataLoading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <div className="grid md:grid-cols-1 gap-8">
          <Card>
              <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>A log of the 10 most recent flights.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Aircraft</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentBookings.length > 0 ? (
                        recentBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.bookingNumber}</TableCell>
                            <TableCell>{format(parseISO(booking.date), 'PPP')}</TableCell>
                            <TableCell>{booking.aircraft}</TableCell>
                            <TableCell>{booking.purpose}</TableCell>
                            <TableCell>
                                {booking.purpose === 'Training' && `${booking.student} w/ ${booking.instructor}`}
                                {booking.purpose === 'Private' && `Pilot: ${booking.student}`}
                                {booking.purpose === 'Maintenance' && booking.maintenanceType}
                            </TableCell>
                            <TableCell>{booking.flightDuration ? `${booking.flightDuration.toFixed(1)} hrs` : 'N/A'}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">No recent bookings.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Cancellation Reasons</CardTitle>
                  <CardDescription>Breakdown of reasons for cancelled bookings.</CardDescription>
              </CardHeader>
              <CardContent>
                  <CancellationReasonChart bookings={bookingData} />
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Aircraft Utilization</CardTitle>
          <CardDescription>Total flight hours per aircraft model.</CardDescription>
        </CardHeader>
        <CardContent>
            <AircraftUtilizationChart bookings={bookingData} aircraft={aircraftData} />
        </CardContent>
      </Card>
    </main>
  );
}

ReportsPage.title = 'Flight Statistics';
export default ReportsPage;
