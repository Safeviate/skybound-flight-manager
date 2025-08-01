
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Plane, Eye } from 'lucide-react';
import type { Aircraft, Booking, User } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFlightSchedulePageData } from './data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function FlightSchedulePageContent({ 
    initialAircraft, 
    initialBookings,
    initialPersonnel,
}) {
    const [aircraft, setAircraft] = useState(initialAircraft);
    const [bookings, setBookings] = useState(initialBookings);
    const [personnel, setPersonnel] = useState(initialPersonnel);
    const { company } = useUser();

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
    

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>Flight Schedule</CardTitle>
                        <CardDescription>View and manage aircraft and personnel schedules.</CardDescription>
                    </div>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Eye className="mr-2 h-4 w-4" />
                                View Fleet
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Aircraft Fleet</DialogTitle>
                                <DialogDescription>A list of all active aircraft registered in the system.</DialogDescription>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto">
                                <ul className="space-y-2">
                                    {aircraft.filter(ac => ac.status !== 'Archived').map((ac: Aircraft) => (
                                        <li key={ac.id} className="flex justify-between items-center p-2 border rounded-md">
                                            <span className="font-medium">{ac.tailNumber}</span>
                                            <span className="text-sm text-muted-foreground">{ac.make} {ac.model}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Schedule view will be implemented here.</p>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
