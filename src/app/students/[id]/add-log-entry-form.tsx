
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
import type { Role, User, Aircraft, TrainingLogEntry } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { SignaturePad } from '@/components/ui/signature-pad';


const logEntryFormSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  startHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  endHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  instructorName: z.string({
    required_error: 'Please select the instructor.',
  }),
  instructorNotes: z.string().min(10, {
    message: 'Notes must be at least 10 characters long.',
  }),
  instructorSignature: z.string().optional(),
}).refine(data => data.endHobbs > data.startHobbs, {
    message: 'End Hobbs must be greater than Start Hobbs.',
    path: ['endHobbs'],
});

type LogEntryFormValues = z.infer<typeof logEntryFormSchema>;

interface AddLogEntryFormProps {
    studentId: string;
    onSubmit: (data: Omit<TrainingLogEntry, 'id'>) => void;
}

export function AddLogEntryForm({ studentId, onSubmit }: AddLogEntryFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [instructors, setInstructors] = useState<User[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntryFormSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  useEffect(() => {
    const fetchData = async () => {
        if (!company) return;
        const instructorRoles: Role[] = ['Instructor', 'Chief Flight Instructor', 'Head Of Training'];
        const instQuery = query(collection(db, `companies/${company.id}/users`), where('role', 'in', instructorRoles));
        const acQuery = query(collection(db, `companies/${company.id}/aircraft`), where('status', '==', 'Available'));
        
        const [instSnapshot, acSnapshot] = await Promise.all([getDocs(instQuery), getDocs(acQuery)]);
        
        setInstructors(instSnapshot.docs.map(doc => doc.data() as User));
        setAircraft(acSnapshot.docs.map(doc => doc.data() as Aircraft));
    };
    fetchData();
  }, [company]);

  function handleFormSubmit(data: LogEntryFormValues) {
    const flightDuration = parseFloat((data.endHobbs - data.startHobbs).toFixed(1));
    
    const newEntry = {
      ...data,
      flightDuration,
      date: format(data.date, 'yyyy-MM-dd'),
    };
    
    onSubmit(newEntry);
    
    toast({
      title: 'Training Log Added',
      description: `A new entry has been added to the student's log.`,
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                        {aircraft.map((ac) => (
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
                name="startHobbs"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Start Hobbs</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" placeholder="1234.5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="endHobbs"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>End Hobbs</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.1" placeholder="1235.5" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
          control={form.control}
          name="instructorName"
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
                  {instructors.map((instructor) => (
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
        <FormField
            control={form.control}
            name="instructorSignature"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Instructor Signature</FormLabel>
                    <FormControl>
                        <SignaturePad onEnd={field.onChange} />
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
