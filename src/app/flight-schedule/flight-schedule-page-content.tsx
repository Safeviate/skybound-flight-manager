
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Aircraft, Booking, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFlightSchedulePageData } from './data';
import { GanttChart } from './gantt-chart';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export function FlightSchedulePageContent({ 
    initialAircraft, 
    initialBookings,
    initialPersonnel,
}) {
    const [aircraft, setAircraft] = useState(initialAircraft);
    const [bookings, setBookings] = useState(initialBookings);
    const [personnel, setPersonnel] = useState(initialPersonnel);
    const { user, company } = useUser();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const { toast } = useToast();

    const refreshData = async () => {
        if (!company) return;
        const { aircraft, bookings, personnel } = await getFlightSchedulePageData(company.id);
        setAircraft(aircraft);
        setBookings(bookings);
        setPersonnel(personnel);
    };

    useEffect(() => {
        if (company) {
            refreshData();
        }
    }, [company]);
    
    const students = useMemo(() => personnel.filter(p => p.role === 'Student'), [personnel]);
    const instructors = useMemo(() => personnel.filter(p => p.role === 'Instructor' || p.role === 'Chief Flight Instructor'), [personnel]);

    const bookingsForSelectedDate = useMemo(() => {
        return bookings.filter(booking => isSameDay(parseISO(booking.date), currentDate));
    }, [bookings, currentDate]);
    
    const handleNewBooking = async (data: Omit<Booking, 'id' | 'companyId'>) => {
        if (!company) return;
        const bookingData = { ...data, companyId: company.id };
        
        try {
            await addDoc(collection(db, `companies/${company.id}/bookings`), bookingData);
            toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
            setIsBookingDialogOpen(false);
            refreshData();
        } catch (error) {
            console.error("Error creating booking:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create booking.' });
        }
    };
    
    const handleCellClick = (aircraft: Aircraft, time: string) => {
        setSelectedAircraft(aircraft);
        setSelectedTime(time);
        setIsBookingDialogOpen(true);
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>Flight Schedule</CardTitle>
                        <CardDescription>View and manage aircraft and personnel schedules. Click an empty slot to book.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[280px] justify-start text-left font-normal",
                                        !currentDate && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {currentDate ? format(currentDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(date) => date && setCurrentDate(date)}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <GanttChart 
                        aircraft={aircraft.filter(ac => ac.status !== 'Archived')} 
                        bookings={bookingsForSelectedDate} 
                        date={currentDate} 
                        onCellClick={handleCellClick}
                    />
                </CardContent>
            </Card>
            
            <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Create New Booking</DialogTitle>
                        <DialogDescription>Fill out the form to schedule a flight or maintenance.</DialogDescription>
                    </DialogHeader>
                    <NewBookingForm 
                        aircraft={aircraft}
                        students={students}
                        instructors={instructors}
                        onSubmit={handleNewBooking}
                        initialAircraftId={selectedAircraft?.id || null}
                        initialTime={selectedTime}
                    />
                </DialogContent>
            </Dialog>
        </main>
    );
}
