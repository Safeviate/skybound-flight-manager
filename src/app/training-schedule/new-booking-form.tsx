
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { Aircraft, User, Booking, Role } from '@/lib/types';
import React, { useEffect, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const bookingFormSchema = z.object({
  purpose: z.enum(['Training', 'Maintenance', 'Private']),
  aircraft: z.string(),
  date: z.string(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  // Conditional fields
  student: z.string().optional(),
  instructor: z.string().optional(),
  maintenanceType: z.string().optional(),
}).refine(data => {
    if (data.purpose === 'Training') {
        return !!data.student && !!data.instructor;
    }
    return true;
}, {
    message: "Student and Instructor are required for Training bookings.",
    path: ["student"],
}).refine(data => {
    if (data.purpose === 'Maintenance') {
        return !!data.maintenanceType;
    }
    return true;
}, {
    message: "Maintenance Type is required for Maintenance bookings.",
    path: ["maintenanceType"],
}).refine(data => {
    return data.endTime > data.startTime;
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
  aircraft: Aircraft;
  users: User[];
  onSubmit: (data: Omit<Booking, 'id' | 'companyId' | 'status'> | Booking) => void;
  onDelete?: (bookingId: string) => void;
  existingBooking?: Booking | null;
}

export function NewBookingForm({ aircraft, users, onSubmit, onDelete, existingBooking }: NewBookingFormProps) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
  });

  useEffect(() => {
    form.reset({
      aircraft: existingBooking?.aircraft || aircraft.tailNumber,
      date: existingBooking?.date || format(new Date(), 'yyyy-MM-dd'),
      startTime: existingBooking?.startTime || '',
      endTime: existingBooking?.endTime || '',
      purpose: existingBooking?.purpose,
      student: existingBooking?.student,
      instructor: existingBooking?.instructor,
      maintenanceType: existingBooking?.maintenanceType,
    });
  }, [existingBooking, aircraft, form]);
  
  const purpose = form.watch('purpose');

  const students = useMemo(() => users.filter(u => u.role === 'Student'), [users]);
  const instructors = useMemo(() => users.filter(u => ['Instructor', 'Chief Flight Instructor', 'Head Of Training'].includes(u.role)), [users]);

  function handleFormSubmit(data: BookingFormValues) {
    const cleanData = {
        ...data,
        student: data.purpose === 'Training' ? data.student : null,
        instructor: data.purpose === 'Training' ? data.instructor : null,
        maintenanceType: data.purpose === 'Maintenance' ? data.maintenanceType : null,
    };

    if (existingBooking) {
      onSubmit({ ...existingBooking, ...cleanData });
    } else {
      onSubmit(cleanData as Omit<Booking, 'id' | 'companyId' | 'status'>);
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
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {purpose === 'Training' && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="student"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        )}
        
        {purpose === 'Private' && (
          <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
            <FormField
              control={form.control}
              name="student"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilot</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select pilot" /></SelectTrigger></FormControl>
                    <SelectContent>{users.filter(u => u.role !== 'Student').map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {purpose === 'Maintenance' && (
             <div className="p-4 border rounded-lg">
                <FormField
                    control={form.control}
                    name="maintenanceType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Maintenance Details</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., 100-hour inspection, oil change" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
        )}

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
        <div className="flex justify-between items-center pt-4">
           {existingBooking && onDelete && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete Booking
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the booking.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(existingBooking.id)}>
                                Yes, Delete Booking
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
