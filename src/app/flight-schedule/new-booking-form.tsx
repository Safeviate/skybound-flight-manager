
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Aircraft, User, Booking } from '@/lib/types';
import { useState, useEffect } from 'react';

const bookingFormSchema = z.object({
  purpose: z.enum(['Training', 'Maintenance', 'Private'], {
    required_error: 'Please select a purpose for the booking.',
  }),
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  date: z.date({
    required_error: 'A date is required.',
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Use HH:mm format.",
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Use HH:mm format.",
  }),
  // Conditional fields
  student: z.string().optional(),
  instructor: z.string().optional(),
  maintenanceType: z.string().optional(),
  trainingExercise: z.string().optional(),
}).refine(data => {
    // Custom validation logic here based on purpose
    if (data.purpose === 'Training') {
        return !!data.student && !!data.instructor;
    }
    if (data.purpose === 'Maintenance') {
        return !!data.maintenanceType;
    }
    return true;
}, {
    message: "Required fields are missing for the selected purpose.",
    path: ["student"], // You might need to adjust the path to be more generic or specific
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
    aircraft: Aircraft[];
    students: User[];
    instructors: User[];
    onSubmit: (data: Omit<Booking, 'id' | 'companyId'>) => void;
    initialAircraftId?: string | null;
    initialTime?: string | null;
}

export function NewBookingForm({ aircraft, students, instructors, onSubmit, initialAircraftId, initialTime }: NewBookingFormProps) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  const purpose = form.watch('purpose');

  useEffect(() => {
    if (initialAircraftId) {
        const selectedAircraft = aircraft.find(a => a.id === initialAircraftId);
        if (selectedAircraft) {
            form.setValue('aircraft', selectedAircraft.tailNumber);
        }
    }
    if(initialTime) {
        form.setValue('startTime', initialTime);
    }
  }, [initialAircraftId, initialTime, aircraft, form]);

  function handleFormSubmit(data: BookingFormValues) {
    const bookingData = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
    } as Omit<Booking, 'id' | 'companyId'>;

    onSubmit(bookingData);
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purpose" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Training">Training Flight</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Private">Private Flight</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {purpose && (
            <>
                <FormField
                control={form.control}
                name="aircraft"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Aircraft</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an aircraft" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {aircraft.filter(a => a.status === 'Available' && a.checklistStatus !== 'needs-post-flight').map(ac => (
                                <SelectItem key={ac.id} value={ac.tailNumber}>{ac.model} ({ac.tailNumber})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col col-span-1">
                                <FormLabel>Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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

                {purpose === 'Training' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="student"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Student</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                        </SelectContent>
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
                                        <SelectContent>
                                            {instructors.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                                        </SelectContent>
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
                                    <Input placeholder="e.g., PPL Lesson 5: Stalls" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                 {purpose === 'Maintenance' && (
                    <FormField
                        control={form.control}
                        name="maintenanceType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Maintenance Type</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., 100-hour inspection" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </>
        )}

        <div className="flex justify-end pt-4">
          <Button type="submit">Create Booking</Button>
        </div>
      </form>
    </Form>
  );
}
