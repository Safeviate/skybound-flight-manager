
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
import React, { useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';

const bookingFormSchema = z.object({
  purpose: z.enum(['Training', 'Maintenance', 'Private']),
  aircraft: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
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
    path: ["student"], // You can also put this on "instructor"
}).refine(data => {
    if (data.purpose === 'Maintenance') {
        return !!data.maintenanceType;
    }
    return true;
}, {
    message: "Maintenance Type is required for Maintenance bookings.",
    path: ["maintenanceType"],
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
  aircraft: Aircraft;
  startTime: string;
  users: User[];
  onSubmit: (data: Omit<Booking, 'id' | 'companyId' | 'status'>) => void;
}

const availableEndTimes = (startTime: string) => {
    const startHour = parseInt(startTime.split(':')[0], 10);
    return Array.from({ length: 24 - startHour }, (_, i) => {
        const hour = startHour + i + 1;
        return `${hour.toString().padStart(2, '0')}:00`;
    });
};

export function NewBookingForm({ aircraft, startTime, users, onSubmit }: NewBookingFormProps) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      aircraft: aircraft.tailNumber,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: startTime,
    },
  });
  
  const purpose = form.watch('purpose');

  const students = useMemo(() => users.filter(u => u.role === 'Student'), [users]);
  const instructors = useMemo(() => users.filter(u => ['Instructor', 'Chief Flight Instructor', 'Head Of Training'].includes(u.role)), [users]);

  function handleFormSubmit(data: BookingFormValues) {
    onSubmit(data);
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
             <FormItem>
                <FormLabel>Start Time</FormLabel>
                <Input value={startTime} disabled />
             </FormItem>
            <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select end time" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {availableEndTimes(startTime).map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit">Create Booking</Button>
        </div>
      </form>
    </Form>
  );
}
