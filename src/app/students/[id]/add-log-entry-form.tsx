
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { aircraftData, userData } from '@/lib/mock-data';
import type { Role } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

const logEntryFormSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  flightDuration: z.coerce.number().min(0.1, {
    message: 'Flight duration must be at least 0.1 hours.',
  }),
  instructor: z.string({
    required_error: 'Please select the instructor.',
  }),
  instructorNotes: z.string().min(10, {
    message: 'Notes must be at least 10 characters long.',
  }),
});

type LogEntryFormValues = z.infer<typeof logEntryFormSchema>;

export function AddLogEntryForm({ studentId }: { studentId: string }) {
  const { toast } = useToast();
  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntryFormSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  const instructorRoles: Role[] = ['Instructor', 'Chief Flight Instructor', 'Head Of Training'];
  const availableInstructors = userData.filter(p => instructorRoles.includes(p.role));
  const availableAircraft = aircraftData.filter(ac => ac.status !== 'In Maintenance');

  function onSubmit(data: LogEntryFormValues) {
    console.log({
      studentId,
      ...data,
      date: format(data.date, 'yyyy-MM-dd'),
    });
    toast({
      title: 'Training Log Added',
      description: `A new entry has been added to the student's log.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
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
                                    date > new Date() || date < new Date("1900-01-01")
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
        </div>
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
                  {availableAircraft.map((ac) => (
                    <SelectItem key={ac.id} value={ac.tailNumber}>
                      {ac.model} ({ac.tailNumber})
                    </SelectItem>
                  ))}
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
                    <SelectValue placeholder="Select an instructor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableInstructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.name}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button type="submit">Add Log Entry</Button>
        </div>
      </form>
    </Form>
  );
}
