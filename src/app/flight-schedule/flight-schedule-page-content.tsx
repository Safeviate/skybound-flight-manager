
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Calendar as CalendarIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Aircraft, Booking, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFlightSchedulePageData } from './data';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { MonthlyCalendarView } from './monthly-calendar-view';
import { DayViewCalendar } from './day-view-calendar';
import { GanttChartView } from './gantt-chart-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function FlightSchedulePageContent({ 
    initialAircraft, 
    initialBookings,
    initialPersonnel,
}) {
    const [aircraft, setAircraft] = useState(initialAircraft);
    const [bookings, setBookings] = useState(initialBookings);
    const [personnel, setPersonnel] = useState(initialPersonnel);
    const { user, company } = useUser();
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState(new Date());
    const { toast } = useToast();

    const refreshData = useCallback(async () => {
        if (!company) return;
        const { aircraft, bookings, personnel } = await getFlightSchedulePageData(company.id);
        setAircraft(aircraft);
        setBookings(bookings);
        setPersonnel(personnel);
    }, [company]);

    useEffect(() => {
        if (company) {
            refreshData();
        }
    }, [company, refreshData]);
    
    const students = useMemo(() => personnel.filter(p => p.role === 'Student'), [personnel]);
    const instructors = useMemo(() => personnel.filter(p => p.role === 'Instructor' || p.role === 'Chief Flight Instructor'), [personnel]);

    const handleNewBooking = async (data: Omit<Booking, 'id' | 'companyId'>) => {
        if (!company) return;
        const bookingData = { ...data, companyId: company.id };
        
        try {
            await addDoc(collection(db, `companies/${company.id}/bookings`), bookingData);
            
            const bookedAircraft = aircraft.find(a => a.tailNumber === data.aircraft);
            if (bookedAircraft) {
                const aircraftRef = doc(db, `companies/${company.id}/aircraft`, bookedAircraft.id);
                // This logic might need refinement depending on desired state machine
                await updateDoc(aircraftRef, { status: 'Booked' });
            }

            toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
            setIsBookingDialogOpen(false);
            refreshData();
        } catch (error) {
            console.error("Error creating booking:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create booking.' });
        }
    };
    
    const openBookingDialog = (aircraft: Aircraft | null = null, time: string | null = null) => {
        setSelectedAircraft(aircraft);
        setSelectedTime(time);
        setIsBookingDialogOpen(true);
    };

    const handleDayChange = (newDate: Date) => {
        setSelectedDay(newDate);
    }
    
    const changeDay = (offset: number) => {
        setSelectedDay(currentDay => addDays(currentDay, offset));
    }

    return (
        <main className="flex-1 p-4 md:p-8 flex flex-col h-[calc(100vh-5rem)]">
            <Card className="flex flex-col h-full">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Flight Schedule</CardTitle>
                            <CardDescription>View and manage aircraft and personnel schedules.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                             <div className="flex items-center gap-1 p-1 bg-muted rounded-md w-full sm:w-auto">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeDay(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("h-8 w-full justify-start text-left font-normal", !selectedDay && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDay ? format(selectedDay, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={selectedDay} onSelect={(day) => handleDayChange(day || new Date())} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => changeDay(1)}><ArrowRight className="h-4 w-4" /></Button>
                            </div>
                             <Button onClick={() => openBookingDialog()} className="h-10 w-full sm:w-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Booking
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 -mt-4">
                    <Tabs defaultValue="day" className="h-full flex flex-col">
                        <TabsList className="w-fit">
                            <TabsTrigger value="day">Day View</TabsTrigger>
                            <TabsTrigger value="gantt">Gantt View</TabsTrigger>
                            <TabsTrigger value="month">Monthly View</TabsTrigger>
                        </TabsList>
                        <TabsContent value="day" className="flex-1">
                             <DayViewCalendar 
                                bookings={bookings}
                                aircraft={aircraft.filter(a => a.status !== 'Archived')}
                                selectedDay={selectedDay}
                                onDayChange={handleDayChange}
                                onNewBooking={openBookingDialog}
                             />
                        </TabsContent>
                        <TabsContent value="gantt" className="flex-1">
                            <GanttChartView
                                bookings={bookings}
                                aircraft={aircraft.filter(a => a.status !== 'Archived')}
                                selectedDay={selectedDay}
                            />
                        </TabsContent>
                        <TabsContent value="month" className="flex-1">
                            <MonthlyCalendarView bookings={bookings} onDaySelect={handleDayChange} />
                        </TabsContent>
                    </Tabs>
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
                        initialDate={selectedDay}
                    />
                </DialogContent>
            </Dialog>
        </main>
    );
}
