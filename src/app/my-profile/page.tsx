
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { userData, aircraftData, checklistData as initialChecklistData, bookingData as initialBookingData } from '@/lib/mock-data';
import { Mail, Phone, User as UserIcon, Briefcase, Calendar as CalendarIcon, Edit, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, Checklist, User as AppUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditProfileForm } from './edit-profile-form';
import { ChecklistCard } from '../checklists/checklist-card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

export default function MyProfilePage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data

    const [checklists, setChecklists] = useState<Checklist[]>(initialChecklistData);
    const [bookings, setBookings] = useState<Booking[]>(initialBookingData);
    
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);

    if (loading || !user) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="My Profile" />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>Loading...</p>
                </main>
            </div>
        )
    }

    const handleItemToggle = (toggledChecklist: Checklist) => {
        setChecklists(prevChecklists =>
          prevChecklists.map(c => (c.id === toggledChecklist.id ? toggledChecklist : c))
        );
    };

    const handleChecklistUpdate = (updatedChecklist: Checklist) => {
        handleItemToggle(updatedChecklist); // Persist final state
    
        const isComplete = updatedChecklist.items.every(item => item.completed);
        if (isComplete && updatedChecklist.aircraftId) {
            setBookings(prevBookings => 
                prevBookings.map(booking => {
                    const aircraft = aircraftData.find(ac => ac.id === updatedChecklist.aircraftId);
                    if (aircraft && booking.aircraft === aircraft.tailNumber && booking.purpose === 'Training' && booking.status === 'Upcoming') {
                        return { ...booking, isChecklistComplete: true };
                    }
                    return booking;
                })
            )
        }
      };
      
      const handleReset = (checklistId: string) => {
        setChecklists(prevChecklists =>
          prevChecklists.map(c => {
            if (c.id === checklistId) {
              return {
                ...c,
                items: c.items.map(item => ({ ...item, completed: false })),
              };
            }
            return c;
          })
        );
      };

    const userBookings = bookings.filter(b => b.instructor === user.name || b.student === user.name);

    const getBookingsForDay = (day: Date | undefined) => {
        if (!day) return [];
        return userBookings
        .filter(booking => isSameDay(parseISO(booking.date), day))
        .sort((a, b) => a.time.localeCompare(b.time));
    };

    const bookedDays = userBookings.map(b => parseISO(b.date));
    const selectedDayBookings = getBookingsForDay(selectedDay);

    const getRoleVariant = (role: AppUser['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            case 'Student':
                return 'default'
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
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
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
                      <TableHead>Details</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDayBookings.map(booking => {
                       const relatedAircraft = aircraftData.find(a => a.tailNumber === booking.aircraft);
                       const preFlightChecklist = relatedAircraft ? checklists.find(c => c.category === 'Pre-Flight' && c.aircraftId === relatedAircraft.id) : undefined;
                       return (
                        <TableRow key={booking.id}>
                            <TableCell>{booking.time}</TableCell>
                            <TableCell className="font-medium">{booking.aircraft}</TableCell>
                            <TableCell>{user.role === 'Instructor' ? booking.student : booking.instructor}</TableCell>
                            <TableCell>
                            <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {booking.purpose === 'Training' && booking.status === 'Upcoming' && preFlightChecklist && (
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                                Checklist
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
                                            <ChecklistCard 
                                                checklist={preFlightChecklist} 
                                                onItemToggle={handleItemToggle}
                                                onUpdate={handleChecklistUpdate}
                                                onReset={handleReset}
                                            />
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </TableCell>
                        </TableRow>
                       );
                    })}
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
