import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Booking } from '@/lib/types';
import { PlusCircle } from 'lucide-react';

const bookingData: Booking[] = [
  { id: '1', date: '2024-08-15', time: '14:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training' },
  { id: '2', date: '2024-08-16', time: '09:00', aircraft: 'N54321', student: 'N/A', instructor: 'Hank Hill', purpose: 'Maintenance' },
  { id: '3', date: '2024-08-16', time: '11:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training' },
  { id: '4', date: '2024-08-17', time: '10:00', aircraft: 'N11223', student: 'Peter Jones', instructor: 'Mike Ross', purpose: 'Training' },
  { id: '5', date: '2024-08-17', time: '16:00', aircraft: 'N44556', student: 'N/A', instructor: 'N/A', purpose: 'Private' },
];

export default function BookingsPage() {
    const getPurposeVariant = (purpose: Booking['purpose']) => {
        switch (purpose) {
            case 'Training':
                return 'default'
            case 'Maintenance':
                return 'destructive'
            case 'Private':
                return 'secondary'
            default:
                return 'outline'
        }
    }
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Aircraft Bookings" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Schedule</CardTitle>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Purpose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingData.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.date}</TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell className="font-medium">{booking.aircraft}</TableCell>
                    <TableCell>{booking.student}</TableCell>
                    <TableCell>{booking.instructor}</TableCell>
                    <TableCell>
                      <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
