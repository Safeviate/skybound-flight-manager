
'use client';

import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { bookingData, userData, aircraftData } from '@/lib/mock-data';
import { format, parseISO, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const MonthlyFlightHoursChart = ({ selectedAircraftId }: { selectedAircraftId: string }) => {
    const monthlyHours = useMemo(() => {
        const studentLogs = userData.filter(u => u.role === 'Student').flatMap(s => s.trainingLogs || []);
        
        const filteredLogs = selectedAircraftId === 'all'
            ? studentLogs
            : studentLogs.filter(log => {
                const aircraft = aircraftData.find(ac => ac.tailNumber === log.aircraft);
                return aircraft?.id === selectedAircraftId;
            });

        const hoursByMonth = filteredLogs.reduce((acc, log) => {
            const month = format(startOfMonth(parseISO(log.date)), 'MMM yy');
            acc[month] = (acc[month] || 0) + log.flightDuration;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(hoursByMonth).map(([name, hours]) => ({
            name,
            hours: parseFloat(hours.toFixed(1)),
        })).reverse();
    }, [selectedAircraftId]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={monthlyHours} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
          }}
        />
        <Legend />
        <Bar dataKey="hours" name="Total Flight Hours" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default function ReportsPage() {
  const [selectedAircraft, setSelectedAircraft] = useState('all');

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Flight Statistics" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Operational Metrics</CardTitle>
            <CardDescription>Insights into aircraft usage and flight activity across the fleet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-y-12 md:gap-x-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-center mb-4">Aircraft Utilization by Bookings</h3>
              <AircraftUtilizationChart />
            </div>
            <div>
              <div className="flex flex-col items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-center">Total Flight Hours by Month</h3>
                <div className="w-full max-w-xs">
                    <Select value={selectedAircraft} onValueChange={setSelectedAircraft}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Aircraft" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Aircraft</SelectItem>
                            {aircraftData.map(ac => (
                                <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.model})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              </div>
              <MonthlyFlightHoursChart selectedAircraftId={selectedAircraft} />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
