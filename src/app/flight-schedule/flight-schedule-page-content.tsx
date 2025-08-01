
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { Aircraft, Booking, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFlightSchedulePageData } from './data';

export function FlightSchedulePageContent({ 
    initialAircraft, 
    initialBookings,
    initialPersonnel,
}) {
    const [aircraft, setAircraft] = useState(initialAircraft);
    const [bookings, setBookings] = useState(initialBookings);
    const [personnel, setPersonnel] = useState(initialPersonnel);
    const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
    const { company } = useUser();
    const { toast } = useToast();

    const students = personnel.filter(p => p.role === 'Student');
    const instructors = personnel.filter(p => ['Instructor', 'Chief Flight Instructor', 'Head Of Training'].includes(p.role));


    const handleNewBooking = async (data: Omit<Booking, 'id' | 'companyId'>) => {
        if (!company) return;
        try {
            await addDoc(collection(db, `companies/${company.id}/bookings`), {
                ...data,
                companyId: company.id,
                status: 'Approved', // Default status
            });
            toast({
                title: 'Booking Created',
                description: `Flight for ${data.aircraft} has been scheduled successfully.`,
            });
            setIsNewBookingOpen(false);
            const { aircraft, bookings, personnel } = await getFlightSchedulePageData(company.id);
            setAircraft(aircraft);
            setBookings(bookings);
            setPersonnel(personnel);

        } catch (error) {
            console.error("Error creating booking: ", error);
            toast({
                variant: 'destructive',
                title: 'Booking Failed',
                description: 'Could not create the new booking.',
            });
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>Flight Schedule</CardTitle>
                        <CardDescription>View and manage aircraft and personnel schedules.</CardDescription>
                    </div>
                    <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Booking
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Create New Booking</DialogTitle>
                                <DialogDescription>
                                    Fill out the details below to schedule a flight or maintenance event.
                                </DialogDescription>
                            </DialogHeader>
                            <NewBookingForm 
                                aircraft={aircraft}
                                students={students}
                                instructors={instructors}
                                onSubmit={handleNewBooking} 
                            />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Flight schedule view will be built here.</p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
