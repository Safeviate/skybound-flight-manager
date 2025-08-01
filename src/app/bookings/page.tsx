'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Aircraft, Booking } from '@/lib/types';

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
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Bookings content will be here.</p>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
