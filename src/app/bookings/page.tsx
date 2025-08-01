
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function BookingsPage() {
  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            This is the new bookings page. Functionality can be added here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Booking functionality will be implemented here.</p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

BookingsPage.title = 'Bookings';
export default BookingsPage;
