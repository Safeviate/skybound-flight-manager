
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import type { Aircraft, Booking, User, CompletedChecklist } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NewBookingForm } from './new-booking-form';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, AreaChart, ListChecks, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { PreFlightChecklistForm, type PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm, type PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TrainingSchedulePageContentProps {}

export function TrainingSchedulePageContent({}: TrainingSchedulePageContentProps) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBookingSlot, setNewBookingSlot] = useState<{ aircraft: Aircraft, time: string } | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [activeView, setActiveView] = useState<'calendar' | 'gantt'>('gantt');
  const [selectedChecklistAircraft, setSelectedChecklistAircraft] = useState<Aircraft | null>(null);
  const [checklistWarning, setChecklistWarning] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!company) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`), where('status', '!=', 'Archived'));
    const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`));
    const usersQuery = query(collection(db, `companies/${company.id}/users`));

    const unsubAircraft = onSnapshot(aircraftQuery, (snapshot) => {
        setAircraft(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft)));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load aircraft data.' });
        setLoading(false);
    });

    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
        setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    }, (error) => {
        console.error("Error fetching bookings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load booking data.' });
    });

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (error) => {
        console.error("Error fetching users:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load user data.' });
    });

    return () => {
        unsubAircraft();
        unsubBookings();
        unsubUsers();
    };
  }, [company, toast]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => unsubscribe && unsubscribe();
  }, [fetchData]);


  const timeSlots = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`);
  
  const getBookingForSlot = (aircraftTailNumber: string, time: string) => {
    const hour = parseInt(time.split(':')[0], 10);
    return bookings.find(b => {
      if (b.aircraft !== aircraftTailNumber) return false;
      if (b.status === 'Cancelled') return false;
      const startHour = parseInt(b.startTime.split(':')[0], 10);
      const endHour = parseInt(b.endTime.split(':')[0], 10);
      return hour >= startHour && hour < endHour;
    });
  };

  const calculateColSpan = (booking: Booking, time: string) => {
      const startHour = parseInt(booking.startTime.split(':')[0], 10);
      const endHour = parseInt(booking.endTime.split(':')[0], 10);
      const currentHour = parseInt(time.split(':')[0], 10);
      if (startHour !== currentHour) return 0;
      return endHour - startHour;
  };

  const getBookingLabel = (booking: Booking) => {
    if (booking.purpose === 'Maintenance') {
      return `Maintenance: ${booking.maintenanceType || 'Scheduled'}`;
    }
    if(booking.purpose === 'Private') {
        const user = users.find(u => u.name === booking.student);
        return `Private: ${user?.name || booking.student}`;
    }
    return `${booking.purpose}: ${booking.student} w/ ${booking.instructor}`;
  };
  
  const getBookingVariant = (booking: Booking, aircraftForBooking: Aircraft | undefined) => {
    if (booking.status === 'Completed') return 'bg-purple-600';
    if (!aircraftForBooking) return 'bg-gray-400';

    switch (aircraftForBooking.checklistStatus) {
      case 'needs-pre-flight':
        return 'bg-yellow-500';
      case 'needs-post-flight':
        return 'bg-blue-500';
      case 'ready':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const handleBookingSubmit = async (data: Omit<Booking, 'id' | 'companyId' | 'status'> | Booking) => {
    if (!company) {
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
        if (!selectedChecklistAircraft || !company || !user) return;
        
        const isPreFlight = 'registration' in data;
        const newStatus = isPreFlight ? 'needs-post-flight' : 'ready';
        const bookingForChecklist = bookings.find(b => b.id === selectedChecklistAircraft.activeBookingId);
        const bookingNumber = bookingForChecklist?.bookingNumber;

        const batch = writeBatch(db);

        const historyDoc: Omit<CompletedChecklist, 'id'> = {
            aircraftId: selectedChecklistAircraft.id,
            aircraftTailNumber: selectedChecklistAircraft.tailNumber,
            userId: user.id,
            userName: user.name,
            dateCompleted: new Date().toISOString(),
            type: isPreFlight ? 'Pre-Flight' : 'Post-Flight',
            results: data,
            bookingNumber: bookingNumber,
        };

        try {
            // Update aircraft status
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, selectedChecklistAircraft.id);
            const aircraftUpdate: Partial<Aircraft> = { checklistStatus: newStatus };
            // If it's a post-flight, clear the active booking
            if (!isPreFlight) {
                aircraftUpdate.activeBookingId = null;
            }
            batch.update(aircraftRef, aircraftUpdate);

            // Add to checklist history
            const historyCollectionRef = collection(db, `companies/${company.id}/aircraft/${selectedChecklistAircraft.id}/completed-checklists`);
            batch.set(doc(historyCollectionRef), historyDoc);

            // If post-flight, complete the associated booking
            if (!isPreFlight && bookingForChecklist) {
                const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingForChecklist.id);
                batch.update(bookingRef, { status: 'Completed' });
            }

            await batch.commit();

            toast({
                title: 'Checklist Submitted',
                description: `The checklist has been saved. ${!isPreFlight && bookingForChecklist ? 'Booking has been completed.' : ''}`
            });
             setSelectedChecklistAircraft(null);
        } catch (error) {
            console.error("Error submitting checklist:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit checklist.' });
        }
    };
  
  const handleDialogClose = () => {
    setNewBookingSlot(null);
    setEditingBooking(null);
    setSelectedChecklistAircraft(null);
    setChecklistWarning(null);
  }

  const handleChecklistIconClick = (aircraft: Aircraft) => {
    if (aircraft.checklistStatus === 'needs-post-flight') {
      setChecklistWarning("A post-flight check is outstanding for this aircraft. The previous crew must complete their checks before a new pre-flight can be initiated.");
    }
    setSelectedChecklistAircraft(aircraft);
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
      <style jsx>{`
        .container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #212529;
        }
        .view-switcher { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .view-switcher button, .view-switcher a { padding: 10px 15px; font-size: 16px; cursor: pointer; border: 1px solid #0d6efd; background-color: #ffffff; color: #0d6efd; border-radius: 5px; margin-right: 10px; transition: background-color 0.2s, color 0.2s; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
        .view-switcher button.active, .view-switcher button:hover, .view-switcher a:hover { background-color: #0d6efd; color: #ffffff; }
        table { width: 100%; border-collapse: collapse; background-color: #ffffff; table-layout: fixed; }
        th, td { border: 1px solid #dee2e6; padding: 0; text-align: left; height: 50px; }
        th { background-color: #e9ecef; text-align: center; padding: 12px 0; }
        td.empty-slot { cursor: pointer; transition: background-color 0.2s; }
        td.empty-slot:hover { background-color: #e9ecef; }
        .booking-slot { position: relative; }
        h2 { margin-top: 20px; }
        .gantt-container { overflow-x: auto; border: 1px solid #dee2e6; border-radius: 5px; width: 100%; }
        .gantt-table { min-width: 1800px; width: 100%; }
        .gantt-table th:first-child, .gantt-table td:first-child { position: -webkit-sticky; position: sticky; left: 0; z-index: 2; background-color: #f1f3f5; width: 150px; min-width: 150px; }
        .gantt-table thead th { z-index: 3; }
        .gantt-bar { color: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      `}</style>
      <div className="container">
        <div className="view-switcher">
            <button id="showGanttBtn" className="active">Gantt Chart View</button>
            <Link href="/reports">
                <AreaChart size={18} />
                Statistics
            </Link>
        </div>

        <div id="ganttView">
            <h2>Daily Schedule</h2>
             <div className="gantt-container">
                <table className="gantt-table">
                    <thead>
                        <tr>
                            <th>Aircraft</th>
                            {timeSlots.map(time => <th key={time}>{time}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {aircraft.map(ac => {
                          const renderedSlots = new Set();
                          return (
                          <tr key={ac.id}>
                                <td>
                                  <div className="flex items-center justify-between px-3 h-full">
                                    <span>{ac.tailNumber}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleChecklistIconClick(ac)}>
                                      <ListChecks className={cn(
                                        "h-4 w-4",
                                        ac.checklistStatus === 'needs-post-flight' ? 'text-red-500' : 'text-green-500'
                                      )} />
                                    </Button>
                                  </div>
                                </td>
                                {timeSlots.map(time => {
                                  if (renderedSlots.has(time)) return null;

                                  const booking = getBookingForSlot(ac.tailNumber, time);
                                  if (booking) {
                                    const colSpan = calculateColSpan(booking, time);
                                    if (colSpan > 0) {
                                      for (let i = 1; i < colSpan; i++) {
                                        const nextHour = parseInt(time.split(':')[0], 10) + i;
                                        renderedSlots.add(`${nextHour.toString().padStart(2, '0')}:00`);
                                      }
                                      const aircraftForBooking = aircraft.find(a => a.tailNumber === booking.aircraft);
                                      return (
                                        <td key={time} colSpan={colSpan} className="booking-slot" onClick={() => setEditingBooking(booking)}>
                                          <div className={cn('gantt-bar', getBookingVariant(booking, aircraftForBooking))}>
                                            {getBookingLabel(booking)}
                                          </div>
                                        </td>
                                      )
                                    }
                                  }
                                  return (
                                    <td key={time} className="empty-slot" onClick={() => setNewBookingSlot({ aircraft: ac, time })}></td>
                                  );
                                })}
                            </tr>
                          )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
       <Dialog open={!!newBookingSlot || !!editingBooking} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit Booking' : 'Create New Booking'}</DialogTitle>
            <DialogDescription>
              {editingBooking 
                ? `Editing booking for ${editingBooking.aircraft} on ${editingBooking.date}`
                : `Creating a booking for ${newBookingSlot?.aircraft.tailNumber} at ${newBookingSlot?.time}`
              }
            </DialogDescription>
          </DialogHeader>
          {(newBookingSlot || editingBooking) && (
            <NewBookingForm
              aircraft={editingBooking?.aircraft ? aircraft.find(a => a.tailNumber === editingBooking.aircraft)! : newBookingSlot!.aircraft}
              users={users}
              bookings={bookings}
              onSubmit={handleBookingSubmit}
              onDelete={handleBookingDelete}
              existingBooking={editingBooking}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedChecklistAircraft} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-2xl">
           {selectedChecklistAircraft && (
              <>
                <DialogHeader>
                    <DialogTitle>
                        Aircraft Checklist
                    </DialogTitle>
                     <DialogDescription>
                        For aircraft: {selectedChecklistAircraft.tailNumber}
                    </DialogDescription>
                </DialogHeader>
                {checklistWarning ? (
                    <Alert variant="destructive" className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Action Required</AlertTitle>
                        <AlertDescription>
                            {checklistWarning}
                        </AlertDescription>
                    </Alert>
                ) : (
                    selectedChecklistAircraft.checklistStatus === 'needs-post-flight' ? (
                        <PostFlightChecklistForm 
                            onSuccess={handleChecklistSuccess}
                            aircraft={selectedChecklistAircraft}
                        />
                    ) : (
                        <PreFlightChecklistForm 
                            onSuccess={handleChecklistSuccess} 
                            aircraft={selectedChecklistAircraft}
                        />
                    )
                )}
              </>
           )}
        </DialogContent>
      </Dialog>
    </>
  );
}
