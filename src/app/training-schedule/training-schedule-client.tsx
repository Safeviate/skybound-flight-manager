
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
import { format, parseISO, setHours, setMinutes, isBefore, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSettings } from '@/context/settings-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = (6 + Math.floor(i / 4)) % 24;
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);

const GanttChart = ({ 
    resources, 
    bookings, 
    onSlotClick,
    onBookingClick,
    resourceKey,
    resourceNameKey
}: { 
    resources: any[], 
    bookings: Booking[], 
    onSlotClick: (resource: any, time: string) => void,
    onBookingClick: (booking: Booking, isClickable: boolean) => void,
    resourceKey: string,
    resourceNameKey: string
}) => {
    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    const getBookingForSlot = (resourceIdentifier: string, time: string) => {
        const slotTimeInMinutes = timeToMinutes(time);
        return bookings.find(b => {
            if (b.aircraft !== resourceIdentifier) return false;
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
        if (booking.purpose === 'Hire and Fly') {
            return `${bookingNumPart}${booking.purpose}: ${booking.pilotName}`;
        }
        return `${bookingNumPart}${booking.purpose}: ${booking.student} w/ ${booking.instructor}`;
    };

    const getBookingVariant = (booking: Booking): { className?: string, style?: React.CSSProperties, isClickable: boolean } => {
        if (booking.status === 'Completed') {
            return { className: 'bg-gray-400 text-white', isClickable: false };
        }
        return { className: 'bg-green-500 text-white', isClickable: true };
    };

    return (
        <div className="flex-1 overflow-auto mt-4">
            <table className="w-full border-collapse" style={{ minWidth: '4758px', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th className="sticky top-0 z-20 bg-card text-center p-2 w-[150px] border-r">Resource</th>
                        {hourlyTimeSlots.map(time => <th key={time} colSpan={4} className="text-center p-2 sticky top-0 z-10 bg-card border-l">{time}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {resources.map(resource => {
                        const renderedSlots = new Set();
                        return (
                        <tr key={resource[resourceKey]}>
                            <td className="sticky left-0 z-10 bg-card font-medium text-center p-2 w-[150px] border-r">{resource[resourceNameKey]}</td>
                            {timeSlots.map(time => {
                                if (renderedSlots.has(time)) return null;

                                const booking = getBookingForSlot(resource.tailNumber, time);
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
                                        const variant = getBookingVariant(booking);
                                        return (
                                            <td key={time} colSpan={colSpan} className="p-0 h-[50px]" onClick={() => onBookingClick(booking, variant.isClickable)}>
                                                <div className={cn('h-full flex items-center p-2 text-white text-xs whitespace-nowrap overflow-hidden', variant.className, variant.isClickable ? 'cursor-pointer' : 'cursor-not-allowed')} style={variant.style}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{getBookingLabel(booking)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        )
                                    }
                                }
                                return (
                                    <td key={time} className="h-[50px] p-0 border hover:bg-primary/10 cursor-pointer" onClick={() => onSlotClick(resource, time)}></td>
                                );
                            })}
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
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
    const dayStart = startOfDay(selectedDate);
    return bookings.filter(b => {
        if (b.status === 'Cancelled' || !b.date) return false;
        const bookingStart = parseISO(b.date);
        const bookingEnd = b.endDate ? parseISO(b.endDate) : bookingStart;
        return isWithinInterval(dayStart, { start: startOfDay(bookingStart), end: endOfDay(bookingEnd) });
    });
}, [bookings, selectedDate]);

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
            
            const bookingData = { ...data, id: newBookingId, companyId: company.id, status: 'Approved' as const };
            if (bookingData.purpose !== 'Maintenance') {
                 const bookingCount = bookings.filter(b => b.bookingNumber).length;
                 bookingData.bookingNumber = `BKNG-${(bookingCount + 1).toString().padStart(4, '0')}`;
            }

            const bookingRef = doc(db, `companies/${company.id}/bookings`, newBookingId);
            batch.set(bookingRef, bookingData);

            // Link booking to aircraft
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, newBookingSlot!.aircraft.id);
            batch.update(aircraftRef, { activeBookingId: newBookingId });

            // If it's a training booking, add its ID to the student's pending bookings
            if (bookingData.purpose === 'Training' && bookingData.studentId) {
                const studentRef = doc(db, `companies/${company.id}/students`, bookingData.studentId);
                const selectedAircraft = aircraft.find(ac => ac.tailNumber === bookingData.aircraft);
                const logEntry: TrainingLogEntry = {
                    id: `log-${newBookingId}`,
                    date: bookingData.date,
                    aircraft: `${bookingData.aircraft}`,
                    make: selectedAircraft?.make || '',
                    aircraftType: selectedAircraft?.aircraftType,
                    startHobbs: 0,
                    endHobbs: 0,
                    flightDuration: 0,
                    instructorName: bookingData.instructor || 'Unknown',
                    trainingExercises: [],
                    departure: bookingData.departure,
                    arrival: bookingData.arrival,
                };
                batch.update(studentRef, { 
                    trainingLogs: arrayUnion(logEntry),
                    pendingBookingIds: arrayUnion(newBookingId)
                });
                // Link this log entry ID to the booking
                batch.update(bookingRef, { pendingLogEntryId: logEntry.id });
            }
            
            toast({ title: 'Booking Created', description: `Booking ${bookingData.bookingNumber} has been added to the schedule.` });
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
    const bookingDate = hour < 6 ? addDays(selectedDate, 1) : selectedDate;
    const bookingDateTime = setMinutes(setHours(new Date(bookingDate), hour), minute);
    const now = new Date();

    if (isBefore(bookingDateTime, now)) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'Cannot create a booking in the past.' });
        return;
    }
    setNewBookingSlot({ aircraft, time, date: bookingDate });
  }

  const handleDialogClose = () => {
    setNewBookingSlot(null);
    setActiveFlight(null);
  }

  const handleBookingClick = (booking: Booking, isClickable: boolean) => {
    if (!isClickable) {
        toast({
            variant: 'default',
            title: 'Booking Not Active',
            description: 'This booking cannot be actioned until the preceding flight is completed.',
        });
        return;
    };
    if (booking.status === 'Completed') return;

    const aircraftForBooking = aircraft.find(a => a.tailNumber === booking.aircraft);
    if (aircraftForBooking) {
        setActiveFlight({ booking, aircraft: aircraftForBooking });
    }
  };
  
  const facilities = [
    { id: 'sim-1', name: 'Simulator A' },
    { id: 'brief-1', name: 'Briefing Room 1' },
    { id: 'class-1', name: 'Classroom Alpha' },
  ];

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
      <main className="flex flex-col flex-1 p-4 md:p-8">
        <Tabs defaultValue="bookings" className="flex flex-col flex-1">
            <TabsList>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>
            <TabsContent value="bookings" className="mt-6 flex-1 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Ready for Pre-Flight</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Post-Flight Outstanding</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Completed</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive"></div>In Maintenance</div>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Aircraft Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GanttChart 
                            resources={aircraft} 
                            bookings={filteredBookings}
                            onSlotClick={handleNewBookingClick}
                            onBookingClick={handleBookingClick}
                            resourceKey="id"
                            resourceNameKey="tailNumber"
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Facility Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GanttChart 
                            resources={facilities}
                            bookings={[]} // No bookings for facilities yet
                            onSlotClick={() => { /* TODO */ }}
                            onBookingClick={() => { /* TODO */ }}
                            resourceKey="id"
                            resourceNameKey="name"
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </main>
       <Dialog open={!!newBookingSlot || !!activeFlight} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl">
          {newBookingSlot && (
            <>
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
                <DialogDescription>
                    {`Creating a booking for ${newBookingSlot?.aircraft.tailNumber} on ${newBookingSlot ? format(newBookingSlot.date, 'PPP') : ''}`}
                </DialogDescription>
              </DialogHeader>
              <NewBookingForm
                  aircraft={newBookingSlot.aircraft}
                  users={users}
                  hireAndFly={hireAndFly}
                  bookings={bookings}
                  onSubmit={handleBookingSubmit}
                  startTime={newBookingSlot?.time}
                  selectedDate={newBookingSlot?.date}
                />
            </>
          )}
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

    