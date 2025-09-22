
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { Aircraft, Booking, User, CompletedChecklist, Alert as AlertType, TrainingLogEntry } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch, arrayUnion, getDocs, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Calendar as CalendarIcon, Search, Trash2 } from 'lucide-react';
import { PreFlightChecklistForm, type PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm, type PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, parseISO, setHours, setMinutes, isBefore, addDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/context/settings-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TrainingSchedulePageContentProps {
  initialAircraft: Aircraft[];
  initialBookings: Booking[];
  initialUsers: User[];
  initialHireAndFly: User[];
}

const deletionReasons = [
    'Maintenance',
    'Weather',
    'Congested Airspace',
    'No show - Pilot',
    'No show - Student',
    'Illness - Pilot',
    'Illness - Student',
    'Other',
];

const FlightHub = ({
    activeFlight,
    handleChecklistSuccess,
    onCancelBooking,
}: {
    activeFlight: { booking: Booking, aircraft: Aircraft },
    handleChecklistSuccess: (data: PreFlightChecklistFormValues | PostFlightChecklistFormValues) => Promise<void>,
    onCancelBooking: (bookingId: string, reason: string) => void,
}) => {
    const [deleteReason, setDeleteReason] = useState('');
    const [otherReason, setOtherReason] = useState('');

    const handleConfirmCancellation = () => {
        const finalReason = deleteReason === 'Other' ? `Other: ${otherReason}` : deleteReason;
        if (!finalReason) return;
        onCancelBooking(activeFlight.booking.id, finalReason);
    }
    
    return (
        <>
            <DialogHeader>
                <DialogTitle>Flight Hub: {activeFlight.booking.bookingNumber}</DialogTitle>
                <DialogDescription>
                    {`For ${activeFlight.aircraft.tailNumber} on ${format(parseISO(activeFlight.booking.date), 'PPP')}`}
                </DialogDescription>
            </DialogHeader>
            
            {activeFlight.aircraft.checklistStatus === 'needs-post-flight' ? (
                <PostFlightChecklistForm 
                    onSuccess={handleChecklistSuccess}
                    aircraft={activeFlight.aircraft}
                    startHobbs={activeFlight.booking.startHobbs}
                    onReportIssue={() => {}}
                />
            ) : (
                <PreFlightChecklistForm 
                    onSuccess={handleChecklistSuccess} 
                    aircraft={activeFlight.aircraft}
                    onReportIssue={() => {}}
                    initialHobbs={activeFlight.aircraft.hours}
                />
            )}

            <DialogFooter className="border-t pt-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Cancel Booking
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reason for Cancellation</AlertDialogTitle>
                            <AlertDialogDescription>
                                Please select a reason for cancelling this booking. This information is used for reporting.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4 space-y-4">
                            <Select value={deleteReason} onValueChange={setDeleteReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {deletionReasons.map(reason => (
                                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {deleteReason === 'Other' && (
                                <div className="space-y-2">
                                    <Label htmlFor="other-reason">Please specify:</Label>
                                    <Textarea
                                        id="other-reason"
                                        value={otherReason}
                                        onChange={(e) => setOtherReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmCancellation} disabled={!deleteReason || (deleteReason === 'Other' && !otherReason)}>
                                Yes, Cancel Booking
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogFooter>
        </>
    );
};


export function TrainingSchedulePageContent({ initialAircraft, initialBookings, initialUsers, initialHireAndFly }: TrainingSchedulePageContentProps) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [aircraft, setAircraft] = useState<Aircraft[]>(initialAircraft);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [hireAndFly, setHireAndFly] = useState<User[]>(initialHireAndFly);
  const [loading, setLoading] = useState(true);
  const [newBookingSlot, setNewBookingSlot] = useState<{ aircraft: Aircraft, time: string, date: Date } | null>(null);
  const [activeFlight, setActiveFlight] = useState<{ booking: Booking, aircraft: Aircraft } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  useEffect(() => {
    if (!company) {
        setLoading(false);
        return;
    }
    setLoading(true);
    
    const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
        setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching real-time bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load schedule updates.' });
        setLoading(false);
    });

    const aircraftUnsub = onSnapshot(collection(db, `companies/${company.id}/aircraft`), (snapshot) => {
        setAircraft(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft)));
    });
    
    const fetchAllUsers = async () => {
        const personnelQuery = query(collection(db, `companies/${company.id}/users`));
        const studentsQuery = query(collection(db, `companies/${company.id}/students`));
        const hireAndFlyQuery = query(collection(db, `companies/${company.id}/hire-and-fly`));

        const [personnelSnapshot, studentsSnapshot, hireAndFlySnapshot] = await Promise.all([
            getDocs(personnelQuery),
            getDocs(studentsQuery),
            getDocs(hireAndFlyQuery),
        ]);
        
        const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const hireAndFlyData = hireAndFlySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        setUsers([...personnel, ...students]);
        setHireAndFly(hireAndFlyData);
    };
    fetchAllUsers();
    
    return () => {
        unsubBookings();
        aircraftUnsub();
    };
}, [company, toast]);
  
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => b.status !== 'Cancelled' && b.date === format(selectedDate, 'yyyy-MM-dd'));
  }, [bookings, selectedDate]);
  
  const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
      const hour = (6 + Math.floor(i / 4)) % 24;
      const minute = (i % 4) * 15;
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);


  const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
  }
  
  const getBookingForSlot = (aircraftTailNumber: string, time: string) => {
    const slotTimeInMinutes = timeToMinutes(time);
    return filteredBookings.find(b => {
      if (b.aircraft !== aircraftTailNumber) return false;
      if (b.status === 'Cancelled') return false; 
      const startTimeInMinutes = timeToMinutes(b.startTime);
      const endTimeInMinutes = timeToMinutes(b.endTime);
      return slotTimeInMinutes >= startTimeInMinutes && slotTimeInMinutes < endTimeInMinutes;
    });
  };

  const calculateColSpan = (booking: Booking, time: string) => {
      const startTimeInMinutes = timeToMinutes(booking.startTime);
      const slotTimeInMinutes = timeToMinutes(time);
      if (startTimeInMinutes !== slotTimeInMinutes) return 0;

      const endTimeInMinutes = timeToMinutes(booking.endTime);
      const durationInMinutes = endTimeInMinutes - startTimeInMinutes;
      return Math.ceil(durationInMinutes / 15);
  };

  const getBookingLabel = (booking: Booking) => {
    const bookingNumPart = booking.bookingNumber ? `${booking.bookingNumber} - ` : '';
    if (booking.purpose === 'Maintenance') {
      return `Maintenance: ${booking.maintenanceType || 'Scheduled'}`;
    }
    if (booking.purpose === 'Hire and Fly') {
        return `${bookingNumPart}${booking.purpose}: ${booking.pilotName}`;
    }
    return `${bookingNumPart}${booking.purpose}: ${booking.student} w/ ${booking.instructor}`;
  };
  
  const getBookingVariant = (booking: Booking, aircraftForBooking: Aircraft | undefined): { className?: string, style?: React.CSSProperties } => {
    if (aircraftForBooking?.status === 'In Maintenance') {
        return { className: 'bg-destructive text-destructive-foreground' };
    }

    if (!aircraftForBooking) {
        return { className: 'bg-gray-400 text-white' };
    }
    
    if (booking.status === 'Completed') {
        return { className: 'bg-gray-400 text-white' };
    }
    
    switch (aircraftForBooking.checklistStatus) {
      case 'needs-post-flight':
        return { className: 'bg-blue-500 text-white' };
      case 'ready':
      case 'needs-pre-flight':
        return { className: 'bg-green-500 text-white' };
      default:
        return { className: 'bg-gray-400 text-white' };
    }
  };

  const handleBookingSubmit = async (data: Omit<Booking, 'id' | 'companyId' | 'status'> | Booking) => {
    if (!company || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    
    const batch = writeBatch(db);

    try {
        if ('id' in data) { // This is an existing booking
             const bookingRef = doc(db, `companies/${company.id}/bookings`, data.id);
             batch.update(bookingRef, data as Partial<Booking>);
             toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
        } else { // This is a new booking
            const newBookingId = doc(collection(db, 'temp')).id;
            const newBooking = { ...data, id: newBookingId, companyId: company.id, status: 'Approved' as const };
            const bookingRef = doc(db, `companies/${company.id}/bookings`, newBookingId);
            batch.set(bookingRef, newBooking);

            // Link booking to aircraft
            if (newBooking.purpose !== 'Maintenance') {
                const aircraftRef = doc(db, `companies/${company.id}/aircraft`, newBookingSlot!.aircraft.id);
                batch.update(aircraftRef, { activeBookingId: newBookingId });
            }

            // If it's a training booking, add its ID to the student's pending bookings
            if (newBooking.purpose === 'Training' && newBooking.studentId) {
                const studentRef = doc(db, `companies/${company.id}/students`, newBooking.studentId);
                const selectedAircraft = aircraft.find(ac => ac.tailNumber === newBooking.aircraft);
                const logEntry: TrainingLogEntry = {
                    id: `log-${newBookingId}`,
                    date: newBooking.date,
                    aircraft: `${newBooking.aircraft}`,
                    make: selectedAircraft?.make || '',
                    aircraftType: selectedAircraft?.aircraftType,
                    startHobbs: 0,
                    endHobbs: 0,
                    flightDuration: 0,
                    instructorName: newBooking.instructor || 'Unknown',
                    trainingExercises: [],
                    departure: newBooking.departure,
                    arrival: newBooking.arrival,
                };
                batch.update(studentRef, { 
                    trainingLogs: arrayUnion(logEntry),
                    pendingBookingIds: arrayUnion(newBooking.id)
                });
                // Link this log entry ID to the booking
                batch.update(bookingRef, { pendingLogEntryId: logEntry.id });
            }
            
            toast({ title: 'Booking Created', description: `Booking ${newBooking.bookingNumber} has been added to the schedule.` });
        }
        
        await batch.commit();
        handleDialogClose();
    } catch (error) {
        console.error("Error saving booking:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the booking.' });
    }
  };

  const handleBookingDelete = async (bookingId: string, reason: string) => {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
        return;
    }
    try {
        const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingId);
        await updateDoc(bookingRef, { status: 'Cancelled', cancellationReason: reason });
        toast({ title: 'Booking Cancelled', description: `Reason: ${reason}` });
        handleDialogClose();
    } catch (error) {
        console.error("Error cancelling booking:", error);
        toast({ variant: 'destructive', title: 'Cancellation Failed', description: 'Could not cancel the booking.' });
    }
  }

  const handleChecklistSuccess = async (data: PreFlightChecklistFormValues | PostFlightChecklistFormValues) => {
        if (!activeFlight || !company || !user) return;

        const isPreFlight = 'registration' in data;
        const batch = writeBatch(db);
        
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, activeFlight.aircraft.id);
        const bookingRef = doc(db, `companies/${company.id}/bookings`, activeFlight.booking.id);
        
        try {
            if (isPreFlight) {
                batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
                batch.update(bookingRef, { 
                    startHobbs: data.hobbs,
                    preFlightChecklist: {
                      leftSidePhoto: data.leftSidePhoto,
                      rightSidePhoto: data.rightSidePhoto,
                      defectPhoto: data.defectPhoto
                    }
                });
                toast({ title: 'Pre-Flight Checklist Submitted' });
            } else { // POST-FLIGHT LOGIC
                const flightDuration = activeFlight.booking.startHobbs ? parseFloat((data.hobbs - activeFlight.booking.startHobbs).toFixed(1)) : 0;
                
                batch.update(aircraftRef, {
                    checklistStatus: 'ready',
                    activeBookingId: null,
                    hours: data.hobbs,
                    currentTachoReading: data.tacho,
                });

                batch.update(bookingRef, { 
                    status: 'Completed', 
                    endHobbs: data.hobbs, 
                    flightDuration,
                    fuelUplift: data.fuelUplift,
                    oilUplift: data.oilUplift,
                    postFlightChecklist: {
                        leftSidePhoto: data.leftSidePhoto,
                        rightSidePhoto: data.rightSidePhoto,
                        defectPhoto: data.defectPhoto
                    },
                });

                if (activeFlight.booking.purpose === 'Training' && activeFlight.booking.studentId && activeFlight.booking.pendingLogEntryId) {
                    const studentRef = doc(db, `companies/${company.id}/students`, activeFlight.booking.studentId);
                    const studentSnap = await getDoc(studentRef);

                    if (studentSnap.exists()) {
                        const studentData = studentSnap.data() as User;
                        const newTotalHours = (studentData.flightHours || 0) + flightDuration;
                        
                        const updatedLogs = studentData.trainingLogs?.map(log => 
                            log.id === activeFlight.booking.pendingLogEntryId 
                            ? { ...log, startHobbs: activeFlight.booking.startHobbs, endHobbs: data.hobbs, flightDuration }
                            : log
                        ) || [];
                        
                        batch.update(studentRef, { 
                            trainingLogs: updatedLogs,
                            flightHours: newTotalHours
                        });
                    }
                }
                toast({ title: 'Post-Flight Checklist Submitted', description: 'Logbook entry created and booking completed.' });
            }
            
            await batch.commit();
            handleDialogClose();
        } catch (error) {
            console.error("Error submitting checklist:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit checklist.' });
        }
    };
  
  const handleNewBookingClick = (aircraft: Aircraft, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    
    // Check if the booking time is for the next day (e.g., after midnight)
    const bookingDate = hour < 6 ? addDays(selectedDate, 1) : selectedDate;
    
    const bookingDateTime = setMinutes(setHours(new Date(bookingDate), hour), minute);
    const now = new Date();

    if (isBefore(bookingDateTime, now)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Time',
            description: 'Cannot create a booking in the past.',
        });
        return;
    }

    if (settings.enforcePostFlightCheck && aircraft.checklistStatus === 'needs-post-flight') {
        toast({
            variant: 'destructive',
            title: 'Booking Prohibited',
            description: 'A post-flight check is outstanding for this aircraft. It cannot be booked until the previous flight is signed off.',
        });
        return;
    }
    if (aircraft.status === 'In Maintenance') {
        toast({
            variant: 'destructive',
            title: 'Booking Prohibited',
            description: 'This aircraft is currently in maintenance and cannot be booked.',
        });
        return;
    }
    setNewBookingSlot({ aircraft, time, date: bookingDate });
  }

  const handleDialogClose = () => {
    setNewBookingSlot(null);
    setActiveFlight(null);
  }

  const handleBookingClick = (booking: Booking) => {
    if (booking.status === 'Completed') return;
    const aircraftForBooking = aircraft.find(a => a.tailNumber === booking.aircraft);
    if (aircraftForBooking) {
        setActiveFlight({ booking, aircraft: aircraftForBooking });
    }
  };

  if (loading) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="ml-2">Loading schedule...</p>
        </div>
    );
  }

  return (
    <>
      <style jsx>{`
        table { width: 100%; border-collapse: collapse; background-color: hsl(var(--card)); table-layout: fixed; }
        th, td { border: 1px solid hsl(var(--border)); padding: 0; text-align: left; height: 70px; }
        th { background-color: hsl(var(--muted)); text-align: center; padding: 12px 0; }
        td.empty-slot { cursor: pointer; transition: background-color 0.2s; }
        td.empty-slot:hover { background-color: hsl(var(--muted)); }
        .booking-slot { position: relative; }
        h2 { margin-top: 20px; }
        .gantt-container { 
            overflow-x: auto; 
            border: 1px solid hsl(var(--border));
            border-radius: var(--radius);
            width: 100%;
            box-sizing: border-box;
        }
        .gantt-table { min-width: 3030px; }
        .gantt-table th:first-child, .gantt-table td:first-child { position: -webkit-sticky; position: sticky; left: 0; z-index: 2; background-color: hsl(var(--muted)); width: 150px; min-width: 150px; }
        .gantt-table thead th { z-index: 3; }
        .gantt-bar { 
            padding: 4px 8px; 
            border-radius: 4px; 
            text-align: center; 
            font-size: 11px; 
            white-space: normal; 
            overflow: hidden; 
            position: absolute; 
            top: 0; 
            left: 0; 
            right: 0; 
            bottom: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }
        .gantt-bar.clickable { cursor: pointer; }
        .gantt-bar.not-clickable { cursor: not-allowed; }
        .color-legend { display: flex; flex-wrap: wrap; gap: 15px; font-size: 12px; align-items: center;}
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-color-box { width: 15px; height: 15px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.2); }
      `}</style>
      <div className="flex flex-col flex-1 p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Training Schedule</CardTitle>
                <CardDescription>View and manage all aircraft and instructor bookings.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="bookings">
                    <TabsList>
                        <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bookings" className="mt-6 flex flex-col">
                        <div className="w-full flex flex-col items-start gap-4">
                            <div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-[280px] justify-start text-left font-normal",
                                            !selectedDate && "text-muted-foreground"
                                        )}
                                        data-nosnippet
                                        >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => setSelectedDate(date || new Date())}
                                        initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <h2 className="text-xl font-bold">Daily Schedule for {format(selectedDate, 'PPP')}</h2>
                            </div>
                            <div>
                                <div className="color-legend">
                                    <div className="legend-item"><div className="legend-color-box bg-green-500"></div>Ready for Pre-Flight</div>
                                    <div className="legend-item"><div className="legend-color-box bg-blue-500"></div>Post-Flight Outstanding</div>
                                    <div className="legend-item"><div className="legend-color-box bg-gray-400"></div>Completed</div>
                                    <div className="legend-item"><div className="legend-color-box bg-destructive"></div>In Maintenance</div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-1 flex-col" style={{ minWidth: 0 }}>
                           <div className="gantt-container flex-1">
                            <table className="gantt-table">
                                <thead>
                                    <tr>
                                        <th>Aircraft</th>
                                        {hourlyTimeSlots.map(time => <th key={time} colSpan={4}>{time}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {aircraft.map(ac => {
                                    const renderedSlots = new Set();
                                    return (
                                    <tr key={ac.id}>
                                            <td className="font-semibold text-center">{ac.tailNumber}</td>
                                            {timeSlots.map(time => {
                                            if (renderedSlots.has(time)) return null;

                                            const booking = getBookingForSlot(ac.tailNumber, time);
                                            if (booking) {
                                                const colSpan = calculateColSpan(booking, time);
                                                if (colSpan > 0) {
                                                const startTimeInMinutes = timeToMinutes(booking.startTime);
                                                for (let i = 1; i < colSpan; i++) {
                                                    const nextSlotTimeInMinutes = startTimeInMinutes + i * 15;
                                                    const nextHour = Math.floor(nextSlotTimeInMinutes / 60);
                                                    const nextMinute = nextSlotTimeInMinutes % 60;
                                                    renderedSlots.add(`${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`);
                                                }
                                                const aircraftForBooking = aircraft.find(a => a.tailNumber === booking.aircraft);
                                                const variant = getBookingVariant(booking, aircraftForBooking);
                                                return (
                                                    <td key={time} colSpan={colSpan} className="booking-slot" onClick={() => handleBookingClick(booking)}>
                                                    <div className={cn('gantt-bar', variant.className, booking.status === 'Completed' ? 'not-clickable' : 'clickable')} style={variant.style}>
                                                        <div className="flex items-center gap-2">
                                                            {(aircraftForBooking?.status === 'In Maintenance') && <AlertTriangle className="h-4 w-4 text-white flex-shrink-0" title="Aircraft In Maintenance" />}
                                                            <span>{getBookingLabel(booking)}</span>
                                                        </div>
                                                    </div>
                                                    </td>
                                                )
                                                }
                                            }
                                            return (
                                                <td key={time} className="empty-slot" onClick={() => handleNewBookingClick(ac, time)}></td>
                                            );
                                            })}
                                        </tr>
                                    )
                                    })}
                                </tbody>
                            </table>
                           </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
       </Card>
      </div>
       <Dialog open={!!newBookingSlot} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
            <DialogDescription>
                {`Creating a booking for ${newBookingSlot?.aircraft.tailNumber} on ${newBookingSlot ? format(newBookingSlot.date, 'PPP') : ''}`}
            </DialogDescription>
          </DialogHeader>
          {newBookingSlot && (
            <NewBookingForm
              aircraft={newBookingSlot.aircraft}
              users={users}
              hireAndFly={hireAndFly}
              bookings={bookings}
              onSubmit={handleBookingSubmit}
              startTime={newBookingSlot?.time}
              selectedDate={newBookingSlot?.date}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!activeFlight} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-2xl">
           {activeFlight && (
              <FlightHub 
                activeFlight={activeFlight}
                handleChecklistSuccess={handleChecklistSuccess}
                onCancelBooking={handleBookingDelete}
              />
           )}
        </DialogContent>
      </Dialog>
    </>
  );
}
