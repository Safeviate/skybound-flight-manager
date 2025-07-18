
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
import type { Booking, Student } from '@/lib/types';
import { studentData } from '@/lib/mock-data';

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
  const student = studentData.find(s => s.name === booking.student);

  const form = useForm<LogFlightFormValues>({
    resolver: zodResolver(logFlightFormSchema),
  });

  function onSubmit(data: LogFlightFormValues) {
    if (!student) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Student not found for this booking.',
        });
        return;
    }
    // In a real application, this would save to a database
    // and update the booking status.
    console.log({
      studentId: student.id,
      bookingId: booking.id,
      date: booking.date,
      aircraft: booking.aircraft,
      instructor: booking.instructor,
      ...data,
    });

    toast({
      title: 'Flight Logged',
      description: `Training session for ${student.name} has been logged.`,
    });
    
    onFlightLogged();
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
