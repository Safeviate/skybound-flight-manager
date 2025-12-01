
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { Aircraft, Booking, User, CompletedChecklist, Alert as AlertType, TrainingLogEntry, Facility } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { NewFacilityBookingForm } from './new-facility-booking-form';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch, arrayUnion, getDocs, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Calendar as CalendarIcon, Search, Trash2, Edit } from 'lucide-react';
import { PreFlightChecklistForm, type PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm, type PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, parse, parseISO, setHours, setMinutes, isBefore, addDays, startOfDay, endOfDay, isWithinInterval, isSameDay, add, sub, isAfter } from 'date-fns';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { InFlightNotes } from './in-flight-notes';

interface TrainingSchedulePageContentProps {
  initialAircraft: Aircraft[];
  initialBookings: Booking[];
  initialUsers: User[];
  initialHireAndFly: User[];
}

const FlightHub = ({
    activeFlight,
    handleChecklistSuccess,
    onCancelBooking,
    onEditBooking
}: {
    activeFlight: { booking: Booking, aircraft: Aircraft },
    handleChecklistSuccess: (data: PreFlightChecklistFormValues | PostFlightChecklistFormValues) => Promise<void>,
    onCancelBooking: (bookingId: string, reason: string) => void,
    onEditBooking: () => void,
}) => {
    
    return (
        <>
            <DialogHeader>
                <DialogTitle>Flight Hub: {activeFlight.booking.bookingNumber}</DialogTitle>
                <DialogDescription>
                    {`For ${activeFlight.aircraft.tailNumber} on ${format(parseISO(activeFlight.booking.date), 'PPP')}`}
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
                {activeFlight.aircraft.checklistStatus === 'needs-post-flight' ? (
                    <Tabs defaultValue="checklist">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="checklist">Post-Flight Checklist</TabsTrigger>
                            <TabsTrigger value="notes">In-Flight Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="checklist" className="mt-4">
                            <PostFlightChecklistForm 
                                onSuccess={handleChecklistSuccess}
                                aircraft={activeFlight.aircraft}
                                startHobbs={activeFlight.booking.startHobbs}
                                onReportIssue={() => {}}
                            />
                        </TabsContent>
                        <TabsContent value="notes" className="mt-4">
                            <InFlightNotes bookingId={activeFlight.booking.id} />
                        </TabsContent>
                    </Tabs>
                ) : (
                    <PreFlightChecklistForm 
                        onSuccess={handleChecklistSuccess} 
                        aircraft={activeFlight.aircraft}
                        onReportIssue={() => {}}
                        onCancelBooking={onCancelBooking}
                        initialHobbs={activeFlight.aircraft.hours}
                        booking={activeFlight.booking}
                        onEditBooking={onEditBooking}
                    />
                )}
            </div>
        </>
    );
};

const BookingTooltipContent = ({ booking }: { booking: Booking }) => (
    <div className="p-2 text-sm space-y-1">
        <p className="font-bold">{booking.bookingNumber || booking.title}</p>
        <p><strong>Time:</strong> {booking.startTime} - {booking.endTime}</p>
        <p><strong>Purpose:</strong> {booking.purpose}</p>
        {booking.purpose === 'Training' && <p><strong>Student:</strong> {booking.student}</p>}
        {booking.purpose === 'Training' && <p><strong>Instructor:</strong> {booking.instructor}</p>}
        {booking.purpose === 'Hire and Fly' && <p><strong>Pilot:</strong> {booking.pilotName}</p>}
        <p><strong>Aircraft:</strong> {booking.aircraft}</p>
        <p><strong>Status:</strong> <Badge variant={booking.status === 'Completed' ? 'secondary' : 'default'}>{booking.status}</Badge></p>
    </div>
);

const timeSlots = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = (6 + Math.floor(i / 4)) % 24;
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const hourlyTimeSlots = Array.from({ length: 24 }, (_, i) => `${((i + 6) % 24).toString().padStart(2, '0')}:00`);

const GanttChart = ({ 
    resources, 
    bookings, 
    aircraft,
    onSlotClick,
    onBookingClick,
    resourceKey,
    resourceNameKey,
    getBookingVariant,
    selectedDate,
}: { 
    resources: any[], 
    bookings: Booking[], 
    aircraft?: Aircraft[],
    onSlotClick: (resource: any, time: string) => void,
    onBookingClick: (booking: Booking) => void,
    resourceKey: string,
    resourceNameKey: string,
    getBookingVariant: (booking: Booking) => { className?: string, style?: React.CSSProperties, isClickable: boolean },
    selectedDate: Date,
}) => {
    const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
    
    const getBookingForSlot = (resourceIdentifier: string, time: string) => {
        const [slotHour, slotMinute] = time.split(':').map(Number);
        const isNextDaySlot = slotHour < 6;
        const slotDate = isNextDaySlot ? addDays(startOfDay(selectedDate), 1) : startOfDay(selectedDate);
        const slotDateTime = setMinutes(setHours(slotDate, slotHour), slotMinute);

        return bookings.find(b => {
            const bookingResourceIdentifier = b.resourceType === 'facility' ? b.facilityId : b.aircraft;
            if (bookingResourceIdentifier !== resourceIdentifier) return false;
            
            const bookingStartDateTime = parseISO(`${b.date}T${b.startTime}`);
            let bookingEndDateTime = parseISO(`${b.endDate || b.date}T${b.endTime}`);
            
            if (isBefore(bookingEndDateTime, bookingStartDateTime)) {
                bookingEndDateTime = addDays(bookingEndDateTime, 1);
            }
            
            return isWithinInterval(slotDateTime, { start: bookingStartDateTime, end: bookingEndDateTime });
        });
    };

    const calculateColSpan = (booking: Booking, time: string) => {
        const viewStart = setHours(startOfDay(selectedDate), 6);
        const viewEnd = addDays(viewStart, 1);

        const bookingStart = parseISO(`${booking.date}T${booking.startTime}`);
        let bookingEnd = parseISO(`${booking.endDate || booking.date}T${booking.endTime}`);
        if(isBefore(bookingEnd, bookingStart)) bookingEnd = addDays(bookingEnd, 1);

        const visibleBookingStart = isAfter(bookingStart, viewStart) ? bookingStart : viewStart;
        const visibleBookingEnd = isBefore(bookingEnd, viewEnd) ? bookingEnd : viewEnd;
        
        let startTimeToRender;
        const bookingStartInMinutes = timeToMinutes(format(visibleBookingStart, 'HH:mm'));
        const slotTimeInMinutes = timeToMinutes(time);

        if (isBefore(bookingStart, viewStart) && time === '06:00') {
             startTimeToRender = '06:00';
        } else if (bookingStartInMinutes === slotTimeInMinutes) {
             startTimeToRender = time;
        } else {
            return 0;
        }

        if (time !== startTimeToRender) return 0;
        
        const durationInMinutes = (visibleBookingEnd.getTime() - visibleBookingStart.getTime()) / (1000 * 60);
        return Math.ceil(durationInMinutes / 15);
    };

    const getBookingLabel = (booking: Booking) => {
        const bookingNumPart = booking.bookingNumber ? `${booking.bookingNumber} - ` : '';
        let line1 = '';
        let line2 = '';

        if (booking.purpose === 'Facility Booking') {
            line1 = `${booking.bookingNumber || ''} - ${booking.title}`;
            line2 = `(${booking.responsiblePerson})`;
        } else if (booking.purpose === 'Hire and Fly') {
            line1 = `${bookingNumPart}${booking.purpose}`;
            line2 = `${booking.pilotName}`;
        } else if (booking.purpose === 'Maintenance') {
            line1 = `Maintenance`;
            line2 = `${booking.maintenanceType}`;
        } else { // Training or other aircraft bookings
            line1 = `${bookingNumPart}${booking.purpose}`;
            line2 = `${booking.student} w/ ${booking.instructor}`;
        }

        return (
            <div className="flex flex-col">
                <span className="font-semibold">{line1}</span>
                <span className="text-xs opacity-90">{line2}</span>
            </div>
        );
    };

    return (
        <div className="relative mt-4">
            <table className="w-full border-collapse" style={{ minWidth: '4758px', tableLayout: 'fixed' }}>
                <thead>
                    <tr>
                        <th className="sticky top-0 z-20 bg-card text-center p-2 w-[90px] border-r">Resource</th>
                        {hourlyTimeSlots.map(time => <th key={time} colSpan={4} className="text-center p-2 sticky top-0 z-10 bg-card border-l">{time}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {resources.map(resource => {
                        const renderedSlots = new Set();
                        return (
                        <tr key={resource[resourceKey]}>
                            <td className="sticky left-0 z-10 bg-card font-medium text-center p-2 w-[90px] border-r">{resource[resourceNameKey]}</td>
                            {timeSlots.map(time => {
                                if (renderedSlots.has(time)) return null;

                                const booking = getBookingForSlot(resource[resourceKey], time);
                                if (booking) {
                                    const colSpan = calculateColSpan(booking, time);
                                    if (colSpan > 0) {
                                        
                                        const [startHour, startMinute] = time.split(':').map(Number);
                                        const startTimeInMinutes = startHour * 60 + startMinute;
                                        
                                        for (let i = 1; i < colSpan; i++) {
                                            const nextSlotTimeInMinutes = startTimeInMinutes + i * 15;
                                            const nextHour = Math.floor(nextSlotTimeInMinutes / 60) % 24;
                                            const nextMinute = nextSlotTimeInMinutes % 60;
                                            renderedSlots.add(`${nextHour.toString().padStart(2, '0')}:${nextMinute.toString().padStart(2, '0')}`);
                                        }
                                        const variant = getBookingVariant(booking);
                                        return (
                                            <td key={time} colSpan={colSpan} className="p-0 h-[50px]">
                                                <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div 
                                                            onClick={() => onBookingClick(booking)}
                                                            className={cn('h-full flex items-center p-2 text-white text-xs whitespace-nowrap overflow-hidden border-r border-white/20', variant.className, (variant.isClickable) ? 'cursor-pointer' : 'cursor-not-allowed')} style={variant.style}>
                                                            {getBookingLabel(booking)}
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <BookingTooltipContent booking={booking} />
                                                    </TooltipContent>
                                                </Tooltip>
                                                </TooltipProvider>
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
  const [newBookingSlot, setNewBookingSlot] = useState<{ aircraft?: Aircraft, facility?: Facility, time: string, date: Date } | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeFlight, setActiveFlight] = useState<{ booking: Booking, aircraft: Aircraft } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

    const getBookingVariant = useCallback((booking: Booking): { className?: string, style?: React.CSSProperties, isClickable: boolean } => {
        if (booking.status === 'Completed') {
            return { className: 'bg-gray-400 text-white', isClickable: true };
        }
        if (booking.purpose === 'Maintenance') {
            return { className: 'bg-destructive text-white', isClickable: true };
        }
        if (booking.purpose === 'Post-Maintenance Flight') {
            return { className: 'bg-purple-600 text-white', isClickable: true };
        }
        if (booking.resourceType === 'facility') {
            return { className: 'bg-sky-500 text-white', isClickable: true };
        }

        const ac = aircraft.find(a => a.tailNumber === booking.aircraft);
        if (!ac) return { className: 'bg-gray-500', isClickable: false };

        const allAircraftBookings = bookings
            .filter(b => b.aircraft === ac.tailNumber && b.status !== 'Cancelled')
            .sort((a, b) => parseISO(`${a.date}T${a.startTime}`).getTime() - parseISO(`${b.date}T${b.startTime}`).getTime());

        const activeBookingForAircraft = allAircraftBookings.find(b => b.status !== 'Completed');

        if (!activeBookingForAircraft || booking.id !== activeBookingForAircraft.id) {
            return { className: 'bg-green-500 text-white opacity-50', isClickable: false };
        }
        
        if (ac.checklistStatus === 'needs-post-flight') {
            return { className: 'bg-blue-500 text-white', isClickable: true };
        }

        return { className: 'bg-green-500 text-white', isClickable: true };
    }, [aircraft, bookings, selectedDate]);
  
  useEffect(() => {
    if (!company) {
        setLoading(false);
        return;
    }
    
    // Attempt to load from cache first
    try {
        const cachedBookings = localStorage.getItem(`schedule-bookings-${company.id}`);
        const cachedAircraft = localStorage.getItem(`schedule-aircraft-${company.id}`);
        const cachedUsers = localStorage.getItem(`schedule-users-${company.id}`);
        const cachedHireAndFly = localStorage.getItem(`schedule-hireandfly-${company.id}`);
        
        if (cachedBookings) setBookings(JSON.parse(cachedBookings));
        if (cachedAircraft) setAircraft(JSON.parse(cachedAircraft));
        if (cachedUsers) setUsers(JSON.parse(cachedUsers));
        if (cachedHireAndFly) setHireAndFly(JSON.parse(cachedHireAndFly));

        if (cachedBookings || cachedAircraft) {
            setLoading(false); // Render with cached data immediately
        }
    } catch (e) {
        console.warn("Could not retrieve schedule data from localStorage.");
    }

    setLoading(true);
    
    const aircraftBookingsQuery = query(collection(db, `companies/${company.id}/aircraft-bookings`));
    const facilityBookingsQuery = query(collection(db, `companies/${company.id}/facility-bookings`));

    const unsubAircraftBookings = onSnapshot(aircraftBookingsQuery, (snapshot) => {
        const aircraftBookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(prev => {
            const newBookings = [...aircraftBookingsData, ...prev.filter(b => b.resourceType === 'facility')];
            localStorage.setItem(`schedule-bookings-${company.id}`, JSON.stringify(newBookings));
            return newBookings;
        });
        setLoading(false);
    }, (error) => {
        console.error("Error fetching real-time aircraft bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load aircraft schedule updates.' });
        setLoading(false);
    });
    
    const unsubFacilityBookings = onSnapshot(facilityBookingsQuery, (snapshot) => {
        const facilityBookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(prev => {
            const newBookings = [...facilityBookingsData, ...prev.filter(b => b.resourceType === 'aircraft')];
            localStorage.setItem(`schedule-bookings-${company.id}`, JSON.stringify(newBookings));
            return newBookings;
        });
        setLoading(false);
    }, (error) => {
        console.error("Error fetching real-time facility bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load facility schedule updates.' });
        setLoading(false);
    });

    const aircraftUnsub = onSnapshot(collection(db, `companies/${company.id}/aircraft`), (snapshot) => {
        const aircraftData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        setAircraft(aircraftData);
        localStorage.setItem(`schedule-aircraft-${company.id}`, JSON.stringify(aircraftData));
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

        const allUsers = [...personnel, ...students];
        setUsers(allUsers);
        setHireAndFly(hireAndFlyData);
        localStorage.setItem(`schedule-users-${company.id}`, JSON.stringify(allUsers));
        localStorage.setItem(`schedule-hireandfly-${company.id}`, JSON.stringify(hireAndFlyData));
    };
    fetchAllUsers();
    
    return () => {
        unsubAircraftBookings();
        unsubFacilityBookings();
        aircraftUnsub();
    };
}, [company, toast]);

    const dailyAircraftBookings = useMemo(() => {
        const startOfView = setHours(startOfDay(selectedDate), 6);
        const endOfView = addDays(startOfView, 1);
        
        return bookings.filter(b => {
            if (b.status === 'Cancelled' || !b.date || b.resourceType !== 'aircraft') return false;
            
            const bookingStart = parseISO(`${b.date}T${b.startTime}`);
            let bookingEnd = parseISO(`${b.endDate || b.date}T${b.endTime}`);

            if (isBefore(bookingEnd, bookingStart)) {
                bookingEnd = addDays(bookingEnd, 1);
            }
            
            const viewInterval = { start: sub(startOfView, {days: 1}), end: endOfView };

            return isWithinInterval(bookingStart, { start: sub(startOfView, {days: 1}), end: endOfView }) ||
                   isWithinInterval(bookingEnd, { start: startOfView, end: add(endOfView, {days: 1}) }) ||
                   (isBefore(bookingStart, startOfView) && isAfter(bookingEnd, endOfView));
        });
    }, [bookings, selectedDate]);

    const dailyFacilityBookings = useMemo(() => {
        const startOfView = setHours(startOfDay(selectedDate), 6);
        const endOfView = addDays(startOfView, 1);

        return bookings.filter(b => {
            if (b.status === 'Cancelled' || !b.date || b.resourceType !== 'facility') return false;

            const bookingStart = parseISO(`${b.date}T${b.startTime}`);
            let bookingEnd = parseISO(`${b.endDate || b.date}T${b.endTime}`);
            if (isBefore(bookingEnd, bookingStart)) bookingEnd = addDays(bookingEnd, 1);

            return isWithinInterval(bookingStart, { start: sub(startOfView, {days: 1}), end: endOfView }) ||
                   isWithinInterval(bookingEnd, { start: startOfView, end: add(endOfView, {days: 1}) }) ||
                   (isBefore(bookingStart, startOfView) && isAfter(bookingEnd, endOfView));
        });
    }, [bookings, selectedDate]);
  
  const handleBookingSubmit = async (data: Omit<Booking, 'id' | 'companyId' | 'status'> | Booking, studentRef?: any, logEntry?: TrainingLogEntry) => {
    if (!company || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    
    const batch = writeBatch(db);

    try {
        if ('id' in data) { // This is an existing booking
             const collectionName = data.resourceType === 'facility' ? 'facility-bookings' : 'aircraft-bookings';
             const bookingRef = doc(db, `companies/${company.id}/${collectionName}`, data.id);
             batch.update(bookingRef, { ...data, endDate: data.endDate || null });
             toast({ title: 'Booking Updated', description: 'The booking has been successfully updated.' });
        } else { // This is a new booking
            const newBookingId = doc(collection(db, 'temp')).id;
            let bookingData: any = { ...data, id: newBookingId, companyId: company.id, status: 'Approved' as const, endDate: data.endDate || null };
            
            const collectionName = bookingData.resourceType === 'facility' ? 'facility-bookings' : 'aircraft-bookings';

            if (bookingData.resourceType === 'aircraft') {
                 const aircraftBookings = bookings.filter(b => b.bookingNumber && b.resourceType === 'aircraft');
                 const bookingNumbers = aircraftBookings.map(b => parseInt(b.bookingNumber!.split('-')[1], 10));
                 const nextId = bookingNumbers.length > 0 ? Math.max(0, ...bookingNumbers) + 1 : 1;
                 bookingData.bookingNumber = `BKNG-${nextId.toString().padStart(4, '0')}`;
            } else if (bookingData.resourceType === 'facility') {
                 const facilityBookings = bookings.filter(b => b.bookingNumber && b.resourceType === 'facility');
                 const bookingNumbers = facilityBookings.map(b => b.bookingNumber!.split('-')[1]).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
                 const nextId = facilityBookings.length > 0 ? Math.max(0, ...bookingNumbers) + 1 : 1;
                 bookingData.bookingNumber = `FAC-${nextId.toString().padStart(4, '0')}`;
            }

            const bookingRef = doc(db, `companies/${company.id}/${collectionName}`, newBookingId);
            
            if (bookingData.resourceType === 'aircraft' && logEntry && bookingData.studentId) {
                const studentDocRef = doc(db, `companies/${company.id}/students`, bookingData.studentId);
                batch.update(studentDocRef, {
                    trainingLogs: arrayUnion(logEntry),
                });
                bookingData.pendingLogEntryId = logEntry.id;
            }
            
            batch.set(bookingRef, bookingData);

            if (bookingData.resourceType === 'aircraft' && newBookingSlot?.aircraft) {
              const aircraftRef = doc(db, `companies/${company.id}/aircraft`, newBookingSlot.aircraft.id);
              
              if (bookingData.purpose === 'Post-Maintenance Flight') {
                batch.update(aircraftRef, { status: 'Available', checklistStatus: 'ready' });
              } else {
                 batch.update(aircraftRef, { activeBookingId: newBookingId });
              }
            }
            
            toast({ title: 'Booking Created', description: `Booking ${bookingData.bookingNumber || 'for facility'} has been added to the schedule.` });
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
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const collectionName = booking.resourceType === 'facility' ? 'facility-bookings' : 'aircraft-bookings';
    
    try {
        const bookingRef = doc(db, `companies/${company.id}/${collectionName}`, bookingId);
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
    const bookingCollectionName = activeFlight.booking.resourceType === 'facility' ? 'facility-bookings' : 'aircraft-bookings';
    const bookingRef = doc(db, `companies/${company.id}/${bookingCollectionName}`, activeFlight.booking.id);
  
    try {
        const historyDocRef = doc(collection(db, `companies/${company.id}/aircraft/${activeFlight.aircraft.id}/completed-checklists`));
        const historyData = {
            aircraftId: activeFlight.aircraft.id,
            aircraftTailNumber: activeFlight.aircraft.tailNumber,
            userId: user.id,
            userName: user.name,
            dateCompleted: new Date().toISOString(),
            type: isPreFlight ? 'Pre-Flight' : 'Post-Flight',
            results: data,
            bookingNumber: activeFlight.booking.bookingNumber,
        };
        batch.set(historyDocRef, historyData);

        if (isPreFlight) {
            batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
            batch.update(bookingRef, { startHobbs: data.hobbs, preFlightData: data });
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
                postFlightData: data,
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
                    flightHours: newTotalHours,
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
  
  const handleNewBookingClick = (resource: Aircraft | Facility, time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const bookingDate = hour < 6 ? addDays(selectedDate, 1) : selectedDate;
    const bookingDateTime = setMinutes(setHours(new Date(bookingDate), hour), minute);
    const now = new Date();

    if (isBefore(bookingDateTime, now)) {
        toast({ variant: 'destructive', title: 'Invalid Time', description: 'Cannot create a booking in the past.' });
        return;
    }
    
    if ('tailNumber' in resource) {
        setNewBookingSlot({ aircraft: resource, time, date: bookingDate });
    } else {
        setNewBookingSlot({ facility: resource, time, date: bookingDate });
    }
  }

  const handleDialogClose = () => {
    setNewBookingSlot(null);
    setActiveFlight(null);
    setEditingBooking(null);
  }

  const handleBookingClick = (booking: Booking) => {
    const variant = getBookingVariant(booking);
    if (!variant.isClickable) {
        toast({
            variant: 'default',
            title: 'Booking Not Active',
            description: 'This booking cannot be actioned until the preceding flight is completed.',
        });
        return;
    };
    
    if (booking.status === 'Completed') return;

    if (!booking.resourceType || booking.resourceType === 'aircraft') {
        const aircraftForBooking = aircraft.find(a => a.tailNumber === booking.aircraft);
        if (aircraftForBooking) {
            setActiveFlight({ booking, aircraft: aircraftForBooking });
        }
    } else {
        setEditingBooking(booking);
    }
  };

  const handleEditBookingInFlightHub = () => {
    if (activeFlight) {
        setEditingBooking(activeFlight.booking);
        setActiveFlight(null); // Close the FlightHub to open the edit form
    }
  }

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
        <main className="flex-1 p-4 md:p-8">
            <Card>
                 <Tabs defaultValue="aircraft">
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <TabsList className="grid w-full grid-cols-2 max-w-sm">
                                <TabsTrigger value="aircraft">Aircraft Schedule</TabsTrigger>
                                <TabsTrigger value="facilities">Facility Schedule</TabsTrigger>
                            </TabsList>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full md:w-[280px] justify-start text-left font-normal",
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
                    </CardHeader>
                    <CardContent>
                        <TabsContent value="aircraft">
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-4">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Ready for Pre-Flight</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Post-Flight Outstanding</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600"></div>Post-Maintenance</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Completed</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-destructive"></div>In Maintenance</div>
                            </div>
                            <ScrollArea>
                                <div className="relative">
                                    <TooltipProvider>
                                        <GanttChart 
                                            resources={aircraft} 
                                            bookings={dailyAircraftBookings}
                                            aircraft={aircraft}
                                            onSlotClick={handleNewBookingClick}
                                            onBookingClick={handleBookingClick}
                                            resourceKey="tailNumber"
                                            resourceNameKey="tailNumber"
                                            getBookingVariant={getBookingVariant}
                                            selectedDate={selectedDate}
                                        />
                                    </TooltipProvider>
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="facilities">
                            <ScrollArea>
                                <div className="relative">
                                    <TooltipProvider>
                                        <GanttChart 
                                            resources={company?.facilities || []}
                                            bookings={dailyFacilityBookings}
                                            onSlotClick={handleNewBookingClick}
                                            onBookingClick={handleBookingClick}
                                            resourceKey="id"
                                            resourceNameKey="name"
                                            getBookingVariant={getBookingVariant}
                                            selectedDate={selectedDate}
                                        />
                                    </TooltipProvider>
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </TabsContent>
                    </CardContent>
                 </Tabs>
            </Card>
        </main>
       <Dialog open={!!newBookingSlot || !!activeFlight || !!editingBooking} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl">
          {newBookingSlot?.aircraft && !editingBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
                <DialogDescription>
                    {`Creating a booking for ${newBookingSlot.aircraft.tailNumber} on ${format(newBookingSlot.date, 'PPP')}`}
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
          {newBookingSlot?.facility && !editingBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Create New Facility Booking</DialogTitle>
                <DialogDescription>
                    {`Booking ${newBookingSlot.facility.name} on ${format(newBookingSlot.date, 'PPP')}`}
                </DialogDescription>
              </DialogHeader>
              <NewFacilityBookingForm
                  facility={newBookingSlot.facility}
                  users={users}
                  onSubmit={handleBookingSubmit}
                  startTime={newBookingSlot?.time}
                  selectedDate={newBookingSlot?.date}
              />
            </>
          )}
           {editingBooking && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Booking</DialogTitle>
                <DialogDescription>
                    {`Editing booking ${editingBooking.bookingNumber || editingBooking.title} on ${format(parseISO(editingBooking.date), 'PPP')}`}
                </DialogDescription>
              </DialogHeader>
              {editingBooking.resourceType === 'aircraft' ? (
                <NewBookingForm
                    aircraft={aircraft.find(a => a.tailNumber === editingBooking.aircraft)!}
                    users={users}
                    hireAndFly={hireAndFly}
                    bookings={bookings}
                    onSubmit={handleBookingSubmit}
                    onDelete={handleBookingDelete}
                    existingBooking={editingBooking}
                    selectedDate={parseISO(editingBooking.date)}
                    />
              ) : (
                 <NewFacilityBookingForm
                    facility={company?.facilities?.find(f => f.id === editingBooking.facilityId)!}
                    users={users}
                    onSubmit={handleBookingSubmit}
                    onDelete={handleBookingDelete}
                    existingBooking={editingBooking}
                    selectedDate={parseISO(editingBooking.date)}
                />
              )}
            </>
          )}
          {activeFlight && !editingBooking && (
              <FlightHub 
                activeFlight={activeFlight}
                handleChecklistSuccess={handleChecklistSuccess}
                onCancelBooking={handleBookingDelete}
                onEditBooking={handleEditBookingInFlightHub}
              />
           )}
        </DialogContent>
      </Dialog>
    </>
  );
}
