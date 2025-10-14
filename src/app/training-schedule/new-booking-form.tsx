

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addDays, isBefore, setHours, setMinutes } from 'date-fns';
import type { Aircraft, User, Booking, Role, TrainingLogEntry } from '@/lib/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { useUser } from '@/context/user-provider';

const bookingFormSchema = z.object({
  purpose: z.string().min(1, 'Please select a purpose.'),
  aircraft: z.string(),
  date: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  departure: z.string().optional(),
  arrival: z.string().optional(),
  // Conditional fields
  student: z.string().optional(),
  studentId: z.string().optional(),
  pilotId: z.string().optional(),
  pilotName: z.string().optional(),
  instructor: z.string().optional(),
  maintenanceType: z.string().optional(),
  maintenanceStartDate: z.string().optional(),
  maintenanceEndDate: z.string().optional(),
  bookingNumber: z.string().optional(),
  trainingExercise: z.string().optional(),
}).refine(data => {
    if (data.purpose === 'Training') {
        return !!data.student && !!data.instructor;
    }
    return true;
}, {
    message: "Student and Instructor are required for Training bookings.",
    path: ["student"],
}).refine(data => {
    if (data.purpose === 'Hire and Fly') {
        return !!data.pilotName;
    }
    return true;
}, {
    message: "A pilot is required for this booking type.",
    path: ["pilotName"],
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
  aircraft: Aircraft;
  users: User[];
  hireAndFly: User[];
  bookings: Booking[];
  onSubmit: (data: Omit<Booking, 'id' | 'companyId' | 'status'> | Booking, studentRef?: any, logEntry?: TrainingLogEntry) => void;
  onDelete?: (bookingId: string, reason: string) => void;
  existingBooking?: Booking | null;
  startTime?: string;
  selectedDate?: Date;
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

export function NewBookingForm({ aircraft, users, hireAndFly, bookings, onSubmit, onDelete, existingBooking, startTime, selectedDate }: NewBookingFormProps) {
  const { company } = useUser();
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      startTime: '',
      endTime: '',
      departure: '',
      arrival: '',
      trainingExercise: '',
    }
  });

  const [deleteReason, setDeleteReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    form.reset({
      aircraft: existingBooking?.aircraft || aircraft.tailNumber,
      date: existingBooking?.date || format(selectedDate || new Date(), 'yyyy-MM-dd'),
      startTime: existingBooking?.startTime || startTime,
      endTime: existingBooking?.endTime || '',
      purpose: existingBooking?.purpose,
      student: existingBooking?.student || undefined,
      studentId: existingBooking?.studentId || undefined,
      pilotId: existingBooking?.pilotId || undefined,
      pilotName: existingBooking?.pilotName || undefined,
      instructor: existingBooking?.instructor || undefined,
      maintenanceType: existingBooking?.maintenanceType || undefined,
      maintenanceStartDate: existingBooking?.maintenanceStartDate || undefined,
      maintenanceEndDate: existingBooking?.maintenanceEndDate || undefined,
      bookingNumber: existingBooking?.bookingNumber || undefined,
      departure: existingBooking?.departure || '',
      arrival: existingBooking?.arrival || '',
      trainingExercise: existingBooking?.trainingExercise || '',
    });
  }, [existingBooking, aircraft, startTime, form, selectedDate]);
  
  const purpose = form.watch('purpose');

  const students = useMemo(() => users.filter(u => u.role === 'Student'), [users]);
  const instructors = useMemo(() => users.filter(u => u.role !== 'Student' && u.role !== 'Hire and Fly'), [users]);
  const personnel = useMemo(() => users.filter(u => u.role !== 'Student'), [users]);
  
  const bookingPurposes = useMemo(() => {
    const standardPurposes = [
      { id: 'Training', name: 'Training' },
      { id: 'Hire and Fly', name: 'Hire and Fly' },
      { id: 'Post-Maintenance Flight', name: 'Post-Maintenance Flight' },
      { id: 'Maintenance', name: 'Maintenance' },
    ];
    const customPurposes = company?.bookingPurposes || [];
    return [...standardPurposes, ...customPurposes];
  }, [company?.bookingPurposes]);


  function handleFormSubmit(data: BookingFormValues) {
    let studentRef, logEntry;
    
    if (data.purpose === 'Training' && data.studentId && !existingBooking) {
      const selectedAircraft = aircraft;
      const newLogId = `log-${Date.now()}`;
      data.bookingNumber = `BKNG-${(bookings.length + 1).toString().padStart(4, '0')}`;
      logEntry = {
        id: newLogId,
        date: data.date,
        aircraft: data.aircraft,
        make: selectedAircraft?.make || '',
        aircraftType: selectedAircraft?.aircraftType,
        startHobbs: 0,
        endHobbs: 0,
        flightDuration: 0,
        instructorName: data.instructor || 'Unknown',
        trainingExercises: [],
        departure: data.departure,
        arrival: data.arrival,
      };
      
      data = {...data, pendingLogEntryId: newLogId} as BookingFormValues & {pendingLogEntryId: string}
    }


    const bookingStartDate = new Date(data.date);
    let bookingEndDate = bookingStartDate;
    if (data.endTime < data.startTime) {
        bookingEndDate = addDays(bookingStartDate, 1);
    }

    const cleanData = {
        ...data,
        resourceType: 'aircraft' as const,
        student: data.purpose === 'Training' ? data.student : null,
        studentId: data.purpose === 'Training' ? data.studentId : null,
        pilotId: (data.purpose === 'Hire and Fly' || data.purpose === 'Post-Maintenance Flight') ? data.pilotId : null,
        pilotName: (data.purpose === 'Hire and Fly' || data.purpose === 'Post-Maintenance Flight') ? data.pilotName : null,
        instructor: data.purpose === 'Training' ? data.instructor : null,
        maintenanceType: data.purpose === 'Maintenance' ? data.maintenanceType : null,
        maintenanceStartDate: data.purpose === 'Maintenance' ? data.maintenanceStartDate : null,
        maintenanceEndDate: data.purpose === 'Maintenance' ? data.maintenanceEndDate : null,
        trainingExercise: data.purpose === 'Training' ? data.trainingExercise : null,
        endDate: format(bookingEndDate, 'yyyy-MM-dd'),
    };
    
    if (existingBooking) {
      onSubmit({ ...existingBooking, ...cleanData });
    } else {
      onSubmit(cleanData as Omit<Booking, 'id' | 'companyId' | 'status'>, studentRef, logEntry);
    }
  }

  const handleDeleteConfirm = () => {
    if (existingBooking && onDelete) {
        const finalReason = deleteReason === 'Other' ? `Other: ${otherReason}` : deleteReason;
        if (!finalReason) return;
        onDelete(existingBooking.id, finalReason);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Booking</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select a purpose" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                   {bookingPurposes.map(p => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {purpose === 'Maintenance' ? (
             <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="maintenanceStartDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maintenanceEndDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        ) : (
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="departure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., KPAO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="arrival"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival</FormLabel>
                       <FormControl>
                        <Input placeholder="e.g., KSQL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
        )}

        {purpose === 'Training' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="student"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        const selectedStudent = users.find(u => u.name === value);
                        if (selectedStudent) form.setValue('studentId', selectedStudent.id);
                    }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger></FormControl>
                        <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="instructor"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select instructor" /></SelectTrigger></FormControl>
                        <SelectContent>{instructors.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
                control={form.control}
                name="trainingExercise"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Training Exercise</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Stalls and spins, short field landings..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        )}
        
        {purpose === 'Hire and Fly' && (
          <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="pilotName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilot</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    const selectedPilot = [...hireAndFly, ...personnel].find(u => u.name === value);
                    if (selectedPilot) form.setValue('pilotId', selectedPilot.id);
                  }} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select pilot" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {hireAndFly.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {purpose === 'Post-Maintenance Flight' && (
             <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                <FormField
                control={form.control}
                name="pilotName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Pilot</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        const selectedPilot = personnel.find(p => p.name === value);
                        if (selectedPilot) form.setValue('pilotId', selectedPilot.id);
                    }} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select personnel" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {personnel.map(p => (
                                <SelectItem key={p.id} value={p.name}>{p.name} ({p.role})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        )}
        
        {purpose === 'Maintenance' && (
          <div className="p-4 border rounded-lg space-y-4">
             <FormField
              control={form.control}
              name="maintenanceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Type / Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 100-Hour Inspection" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}


        {purpose !== 'Maintenance' && (
             <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        )}
        <div className="flex justify-between items-center pt-4">
           {existingBooking && onDelete && (
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
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={!deleteReason || (deleteReason === 'Other' && !otherReason)}>
                                Yes, Cancel Booking
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
           )}
           <div className={cn("flex-1 flex justify-end", !existingBooking && 'w-full')}>
                <Button type="submit">{existingBooking ? 'Save Changes' : 'Create Booking'}</Button>
           </div>
        </div>
      </form>
    </Form>
  );
}
