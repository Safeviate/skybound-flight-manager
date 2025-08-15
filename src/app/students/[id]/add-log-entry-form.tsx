
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
import { CalendarIcon, Clock } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import type { Role, User, Aircraft, TrainingLogEntry, Booking } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/user-provider';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { SignaturePad } from '@/components/ui/signature-pad';
import { trainingExercisesData } from '@/lib/data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  startTacho: z.coerce.number().optional(),
  endTacho: z.coerce.number().optional(),
  instructorName: z.string({
    required_error: 'Please select the instructor.',
  }),
  trainingExercise: z.string().optional(),
  weatherConditions: z.string().optional(),
  studentStrengths: z.string().optional(),
  areasForImprovement: z.string().min(10, {
    message: 'Areas for improvement must be at least 10 characters long.',
  }),
  instructorSignature: z.string().min(1, 'Instructor signature is required.'),
}).refine(data => data.endHobbs > data.startHobbs, {
    message: 'End Hobbs must be greater than Start Hobbs.',
    path: ['endHobbs'],
});

type LogEntryFormValues = z.infer<typeof logEntryFormSchema>;

interface AddLogEntryFormProps {
    studentId: string;
    onSubmit: (data: Omit<TrainingLogEntry, 'id'>, fromBookingId?: string) => void;
    booking?: Booking;
}

export function AddLogEntryForm({ studentId, onSubmit, booking }: AddLogEntryFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [instructors, setInstructors] = useState<User[]>([]);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntryFormSchema),
    defaultValues: {
      date: booking ? parseISO(booking.date) : new Date(),
      aircraft: booking?.aircraft,
      startHobbs: booking?.startHobbs || 0,
      endHobbs: booking?.endHobbs || 0,
      instructorName: booking?.instructor,
      startTacho: 0,
      endTacho: 0,
      studentStrengths: '',
      areasForImprovement: '',
    },
  });
  
  useEffect(() => {
    if (booking) {
        form.reset({
            date: parseISO(booking.date),
            aircraft: booking.aircraft,
            startHobbs: booking.startHobbs || 0,
            endHobbs: booking.endHobbs || 0,
            instructorName: booking.instructor || '',
        });
    }
  }, [booking, form]);

  const { watch, setValue } = form;
  const startHobbs = watch('startHobbs');
  const endHobbs = watch('endHobbs');

  const flightDuration = useMemo(() => {
    if (typeof startHobbs === 'number' && typeof endHobbs === 'number' && endHobbs > startHobbs) {
        const durationDecimal = endHobbs - startHobbs;
        const hours = Math.floor(durationDecimal);
        const minutes = Math.round((durationDecimal - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return '00:00';
  }, [startHobbs, endHobbs]);

  useEffect(() => {
    const fetchData = async () => {
        if (!company) return;
        const instructorRoles: Role[] = ['Instructor', 'Chief Flight Instructor', 'Head Of Training'];
        const instQuery = query(collection(db, `companies/${company.id}/users`), where('role', 'in', instructorRoles));
        const acQuery = query(collection(db, `companies/${company.id}/aircraft`), where('status', '!=', 'Archived'));
        
        const [instSnapshot, acSnapshot] = await Promise.all([getDocs(instQuery), getDocs(acQuery)]);
        
        setInstructors(instSnapshot.docs.map(doc => doc.data() as User));
        setAircraftList(acSnapshot.docs.map(doc => doc.data() as Aircraft));
    };
    fetchData();
  }, [company]);

  function handleFormSubmit(data: LogEntryFormValues) {
    const duration = parseFloat((data.endHobbs - data.startHobbs).toFixed(1));
    
    const newEntry = {
      ...data,
      instructorNotes: `Strengths: ${data.studentStrengths || 'N/A'}\nAreas for Improvement: ${data.areasForImprovement}`,
      flightDuration: duration,
      date: format(data.date, 'yyyy-MM-dd'),
    };
    
    onSubmit(newEntry, booking?.id);
    
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Flight Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an aircraft" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {aircraftList.map((ac) => (
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
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <FormField control={form.control} name="startHobbs" render={({ field }) => (<FormItem><FormLabel>Start Hobbs</FormLabel><FormControl><Input type="number" step="0.1" placeholder="1234.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="endHobbs" render={({ field }) => (<FormItem><FormLabel>End Hobbs</FormLabel><FormControl><Input type="number" step="0.1" placeholder="1235.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="startTacho" render={({ field }) => (<FormItem><FormLabel>Start Tacho</FormLabel><FormControl><Input type="number" step="0.1" placeholder="4321.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="endTacho" render={({ field }) => (<FormItem><FormLabel>End Tacho</FormLabel><FormControl><Input type="number" step="0.1" placeholder="4322.0" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5"/>Flight Duration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-center p-4 bg-muted rounded-md">{flightDuration}</div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Training Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="instructorName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Instructor</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="trainingExercise"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Training Exercise</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select exercise" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {trainingExercisesData.map((ex) => ( <SelectItem key={ex} value={ex}>{ex}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="weatherConditions"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Weather Conditions</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., VMC, Wind 270/10kts" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Instructor's Debrief & Signature</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="studentStrengths"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Student's Strengths</FormLabel>
                                <FormControl>
                                    <Textarea
                                    placeholder="Note what the student did well during the session..."
                                    {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="areasForImprovement"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Areas for Next Flight</FormLabel>
                                <FormControl>
                                    <Textarea
                                    placeholder="Note what to focus on in the next session..."
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
                                        <SignaturePad onSubmit={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg">Add Log Entry</Button>
        </div>
      </form>
    </Form>
  );
}
