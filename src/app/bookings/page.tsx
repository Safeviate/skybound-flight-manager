
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartView } from './gantt-chart-view';
import type { Aircraft, Booking } from '@/lib/types';

// Static data for demonstration purposes
const sampleAircraft: Aircraft[] = [
    { id: '1', tailNumber: 'N12345', model: 'Cessna 172', companyId: '', status: 'Available', hours: 1200, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '' },
    { id: '2', tailNumber: 'N54321', model: 'Piper PA-28', companyId: '', status: 'Available', hours: 850, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '' },
    { id: '3', tailNumber: 'N67890', model: 'Diamond DA40', companyId: '', status: 'In Maintenance', hours: 2100, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '' },
];

const sampleBookings: Booking[] = [
    { id: 'b1', companyId: '', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '11:00', aircraft: 'N12345', student: 'John Doe', purpose: 'Training', status: 'Approved' },
    { id: 'b2', companyId: '', date: new Date().toISOString().split('T')[0], startTime: '13:00', endTime: '14:30', aircraft: 'N54321', instructor: 'Jane Smith', purpose: 'Private', status: 'Approved' },
    { id: 'b3', companyId: '', date: new Date().toISOString().split('T')[0], startTime: '08:00', endTime: '17:00', aircraft: 'N67890', purpose: 'Maintenance', status: 'Approved' },
];

function BookingsPage() {
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
            <GanttChartView aircraft={sampleAircraft} bookings={sampleBookings} />
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
