
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO, isBefore } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { aircraftData, userData, trainingExercisesData } from '@/lib/mock-data';
import type { Booking } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';

const bookingFormSchema = z.object({
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  student: z.string().optional(),
  instructor: z.string().optional(),
  date: z.date({
    required_error: 'A date is required.',
  }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Please enter a valid time in HH:mm format.",
  }),
  purpose: z.enum(['Training', 'Maintenance', 'Private'], {
    required_error: 'Please select a purpose.',
  }),
  trainingExercise: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
    onBookingCreated: (newBooking: Omit<Booking, 'id'>) => void;
}

export function NewBookingForm({ onBookingCreated }: NewBookingFormProps) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
  });

  const purpose = form.watch('purpose');

  function onSubmit(data: BookingFormValues) {
    const status = settings.requireInstructorApproval ? 'Pending Approval' : 'Approved';

    const newBooking: Omit<Booking, 'id'> = {
        ...data,
        date: format(data.date, 'yyyy-MM-dd'),
        status,
        student: data.student || 'N/A',
        instructor: data.instructor || 'N/A',
    };
    onBookingCreated(newBooking);
    
    toast({
      title: 'Booking Request Submitted',
      description: status === 'Pending Approval' 
        ? 'The booking is now pending instructor approval.' 
        : 'Your booking has been confirmed.',
    });
  }
  
  const today = new Date('2024-08-15'); // Hardcoding date for consistent display
  today.setHours(0, 0, 0, 0);

  const availableAircraft = aircraftData.filter(ac => {
    const airworthinessExpired = isBefore(parseISO(ac.airworthinessExpiry), today);
    const insuranceExpired = isBefore(parseISO(ac.insuranceExpiry), today);
    return ac.status === 'Available' && !airworthinessExpired && !insuranceExpired;
  });

  const availableInstructors = userData.filter(p => {
    if (p.role !== 'Instructor') return false;
    const medicalExpired = p.medicalExpiry ? isBefore(parseISO(p.medicalExpiry), today) : false;
    const licenseExpired = p.licenseExpiry ? isBefore(parseISO(p.licenseExpiry), today) : false;
    return !medicalExpired && !licenseExpired;
  });

  const availableStudents = userData.filter(s => {
      if (s.role !== 'Student') return false;
    const medicalExpired = s.medicalExpiry ? isBefore(parseISO(s.medicalExpiry), today) : false;
    const licenseExpired = s.licenseExpiry ? isBefore(parseISO(s.licenseExpiry), today) : false;
    return !medicalExpired && !licenseExpired;
  });


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a purpose for the booking" />
                  </SelectTrigger>
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
            <FormField
            control={form.control}
            name="trainingExercise"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Training Exercise</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {trainingExercisesData.map(ex => (
                        <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        <FormField
          control={form.control}
          name="aircraft"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an aircraft" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableAircraft.length > 0 ? (
                    availableAircraft.map(ac => (
                      <SelectItem key={ac.id} value={ac.tailNumber}>{ac.model} ({ac.tailNumber})</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No aircraft available for booking</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="student"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                   {availableStudents.length > 0 ? (
                    availableStudents.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No students available for booking</SelectItem>
                  )}
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
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an instructor (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableInstructors.length > 0 ? (
                    availableInstructors.map(i => (
                      <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                    ))
                  ) : (
                     <SelectItem value="none" disabled>No instructors available for booking</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-4">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col flex-1">
                <FormLabel>Date</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                        )}
                        >
                        {field.value ? (
                            format(field.value, "PPP")
                        ) : (
                            <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                            date < new Date()
                        }
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
                name="time"
                render={({ field }) => (
                    <FormItem className="flex flex-col flex-1">
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                        <Input placeholder="14:00" {...field} />
                    </FormControl>
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
