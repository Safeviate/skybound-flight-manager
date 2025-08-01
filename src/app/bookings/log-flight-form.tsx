
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import type { Booking, User, TrainingLogEntry, Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { format } from 'date-fns';

const logFlightFormSchema = z.object({
  flightDuration: z.coerce.number().min(0.1, {
    message: 'Flight duration must be at least 0.1 hours.',
  }),
  instructorNotes: z.string().min(10, {
    message: 'Notes must be at least 10 characters long.',
  }),
});

type LogFlightFormValues = z.infer<typeof logFlightFormSchema>;

interface LogFlightFormProps {
    booking: Booking;
    onFlightLogged: () => void;
}

export function LogFlightForm({ booking, onFlightLogged }: LogFlightFormProps) {
  const { toast } = useToast();
  const { company } = useUser();

  const form = useForm<LogFlightFormValues>({
    resolver: zodResolver(logFlightFormSchema),
  });

  async function onSubmit(data: LogFlightFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.' });
        return;
    }

    try {
        const studentRef = doc(db, `companies/${company.id}/users`, booking.student);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
             toast({ variant: 'destructive', title: 'Error', description: 'Student not found for this booking.' });
             return;
        }
        const studentData = studentSnap.data() as User;
        
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, booking.aircraft.replace(/[^A-Z0-9]/g, ''));
        const aircraftSnap = await getDoc(aircraftRef);
        const aircraftData = aircraftSnap.exists() ? aircraftSnap.data() as Aircraft : null;

        // 1. Create a training log entry
        const newLogEntry: Omit<TrainingLogEntry, 'id'> = {
            date: booking.date,
            aircraft: booking.aircraft,
            flightDuration: data.flightDuration,
            instructorName: booking.instructor,
            instructorNotes: data.instructorNotes,
            // Hobbs would typically be part of the form, but we'll omit for simplicity
            startHobbs: aircraftData ? aircraftData.hours : 0,
            endHobbs: aircraftData ? aircraftData.hours + data.flightDuration : data.flightDuration,
        };
        
        // 2. Update student's flight hours and logbook
        await updateDoc(studentRef, {
            flightHours: (studentData.flightHours || 0) + data.flightDuration,
            trainingLogs: arrayUnion({ ...newLogEntry, id: `log-${Date.now()}` }),
        });
        
        // 3. Update aircraft's Hobbs hours
        if (aircraftData) {
            await updateDoc(aircraftRef, {
                hours: aircraftData.hours + data.flightDuration,
            });
        }

        // 4. Update booking status to 'Completed'
        const bookingRef = doc(db, `companies/${company.id}/bookings`, booking.id);
        await updateDoc(bookingRef, { status: 'Completed', flightDuration: data.flightDuration });

        toast({
          title: 'Flight Logged',
          description: `Training session for ${studentData.name} has been logged.`,
        });
        
        onFlightLogged();

    } catch (error) {
        console.error("Error logging flight:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not log flight. Please try again.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <span className="font-semibold">Student:</span> {booking.student}
            </div>
             <div>
                <span className="font-semibold">Instructor:</span> {booking.instructor}
            </div>
            <div>
                <span className="font-semibold">Aircraft:</span> {booking.aircraft}
            </div>
            <div>
                <span className="font-semibold">Date:</span> {booking.date}
            </div>
        </div>
        <FormField
            control={form.control}
            name="flightDuration"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Flight Duration (hrs)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.1" placeholder="1.5" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="instructorNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructor Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Summarize the flight session, noting student's strengths and areas for improvement..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit">Log Flight & Complete Booking</Button>
        </div>
      </form>
    </Form>
  );
}
