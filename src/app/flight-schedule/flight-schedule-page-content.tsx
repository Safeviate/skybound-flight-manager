
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
import { addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFlightSchedulePageData } from './data';
import { format, addDays, subDays, isSameDay, parseISO } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthlyCalendarView } from './monthly-calendar-view';

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

    
    const handleNewBooking = async (data: Omit<Booking, 'id' | 'companyId'>) => {
        if (!company) return;
        const bookingData = { ...data, companyId: company.id };
        
        try {
            await addDoc(collection(db, `companies/${company.id}/bookings`), bookingData);
            
            // Update aircraft checklist status
            const bookedAircraft = aircraft.find(a => a.tailNumber === data.aircraft);
            if (bookedAircraft) {
                const aircraftRef = doc(db, `companies/${company.id}/aircraft`, bookedAircraft.id);
                await updateDoc(aircraftRef, { checklistStatus: 'needs-post-flight' });
            }

            toast({ title: 'Booking Created', description: 'The new booking has been added to the schedule.' });
            setIsBookingDialogOpen(false);
            refreshData();
        } catch (error) {
            console.error("Error creating booking:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create booking.' });
        }
    };
    
    const openBookingDialog = () => {
        setSelectedAircraft(null);
        setSelectedTime(null);
        setIsBookingDialogOpen(true);
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <div className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Flight Schedule</CardTitle>
                            <CardDescription>View and manage aircraft and personnel schedules.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button onClick={openBookingDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Booking
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <MonthlyCalendarView bookings={bookings} />
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
