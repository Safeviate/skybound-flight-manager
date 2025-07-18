import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { bookingData, personnelData } from '@/lib/mock-data';
import { Mail, Phone, User, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, Personnel } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

// In a real app, this would come from the logged-in user's session
const LOGGED_IN_PERSONNEL_ID = '1'; 

export default function MyProfilePage() {
    const user = personnelData.find(p => p.id === LOGGED_IN_PERSONNEL_ID);

    if (!user) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="My Profile" />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>User not found.</p>
                </main>
            </div>
        )
    }

    const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const instructorBookings = bookingData.filter(b => b.instructor === user.name);

    const getBookingsForDay = (day: Date) => {
        return instructorBookings
        .filter(booking => isSameDay(parseISO(booking.date), day))
        .sort((a, b) => a.time.localeCompare(b.time));
    };

    const getRoleVariant = (role: Personnel['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            default:
                return 'outline'
        }
    }

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
      <Header title="My Profile & Roster" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src="https://placehold.co/80x80" alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-3xl">{user.name}</CardTitle>
                        <CardDescription>
                            <Badge variant={getRoleVariant(user.role)} className="mt-1">{user.role}</Badge>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-b pb-6">
                <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.name}</span>
                </div>
                 <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                     <span className="font-medium">{user.role}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.phone}</span>
                </div>
            </CardContent>
        </Card>
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>
              My Weekly Roster: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
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
                    <p className="text-muted-foreground italic px-4">No bookings or leave scheduled.</p>
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
