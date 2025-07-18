
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { bookingData, personnelData } from '@/lib/mock-data';
import { Mail, Phone, User, Briefcase, Calendar as CalendarIcon, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, Personnel } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditProfileForm } from './edit-profile-form';


// In a real app, this would come from the logged-in user's session
const LOGGED_IN_PERSONNEL_ID = '1'; 

export default function MyProfilePage() {
    const user = personnelData.find(p => p.id === LOGGED_IN_PERSONNEL_ID);
    const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data
    
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);

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

    const instructorBookings = bookingData.filter(b => b.instructor === user.name);

    const getBookingsForDay = (day: Date | undefined) => {
        if (!day) return [];
        return instructorBookings
        .filter(booking => isSameDay(parseISO(booking.date), day))
        .sort((a, b) => a.time.localeCompare(b.time));
    };

    const bookedDays = instructorBookings.map(b => parseISO(b.date));
    const selectedDayBookings = getBookingsForDay(selectedDay);

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
        <Card className="max-w-6xl mx-auto">
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
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
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <Edit className="mr-2 h-4 w-4" />
                                Update Information
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Update Your Information</DialogTitle>
                                <DialogDescription>
                                    Make changes to your profile here. Click save when you're done.
                                </DialogDescription>
                            </DialogHeader>
                            <EditProfileForm user={user} />
                        </DialogContent>
                    </Dialog>
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
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle>
              My Roster
            </CardTitle>
            <CardDescription>Select a date to view your schedule. Dates with bookings are highlighted.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="flex justify-center">
                 <Calendar
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay}
                    className="rounded-md border"
                    defaultMonth={today}
                    modifiers={{ booked: bookedDays }}
                    modifiersClassNames={{
                        booked: 'bg-accent/50 text-accent-foreground rounded-full',
                    }}
                 />
            </div>
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6"/>
                    <h3 className="text-xl font-semibold">
                        {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'No date selected'}
                    </h3>
                </div>
              {selectedDayBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Aircraft</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDayBookings.map(booking => (
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
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                        {selectedDay ? "No bookings or leave scheduled for this day." : "Select a day to see your schedule."}
                    </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
