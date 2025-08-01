
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartView } from './gantt-chart-view';
import type { Aircraft, Booking } from '@/lib/types';

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
            <GanttChartView aircraft={[]} bookings={[]} />
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
