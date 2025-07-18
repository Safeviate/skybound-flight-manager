import Header from '@/components/layout/header';
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
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { bookingData } from '@/lib/mock-data';


// In a real app, this would come from the logged-in user's session
const LOGGED_IN_INSTRUCTOR = 'Mike Ross'; 

export default function MyRosterPage() {
  const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const instructorBookings = bookingData.filter(b => b.instructor === LOGGED_IN_INSTRUCTOR);

  const getBookingsForDay = (day: Date) => {
    return instructorBookings
      .filter(booking => isSameDay(parseISO(booking.date), day))
      .sort((a, b) => a.time.localeCompare(b.time));
  };
  
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
      <Header title={`${LOGGED_IN_INSTRUCTOR}'s Roster`} />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Weekly Schedule: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {weekDays.map(day => {
              const dailyBookings = getBookingsForDay(day);
              return (
                <div key={day.toISOString()}>
                  <h3 className="text-lg font-semibold mb-2 border-b pb-1">
                    {format(day, 'EEEE, MMMM d')}
                  </h3>
                  {dailyBookings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/6">Time</TableHead>
                          <TableHead className="w-1/6">Aircraft</TableHead>
                          <TableHead className="w-2/6">Student</TableHead>
                          <TableHead className="w-2/6">Purpose</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyBookings.map(booking => (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.time}</TableCell>
                            <TableCell className="font-medium">{booking.aircraft}</TableCell>
                            <TableCell>{booking.student}</TableCell>
                            <TableCell>
                               <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground italic px-4">No bookings scheduled.</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
