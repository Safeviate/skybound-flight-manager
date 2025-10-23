'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import type { Role, User, Aircraft, TrainingLogEntry, Booking, ExerciseLog } from '@/lib/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const exerciseLogSchema = z.object({
  exercise: z.string().min(1, "Please select an exercise."),
  rating: z.coerce.number().min(1, "A rating is required.").max(4),
  comment: z.string().optional(),
});

const debriefFormSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  aircraft: z.string({
    required_error: 'Please enter an aircraft.',
  }),
  startHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  endHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  instructorName: z.string({
    required_error: 'Please enter the instructor\'s name.',
  }),
  instructorSignature: z.string().min(1, 'Instructor signature is required.'),
  studentSignature: z.string().optional(),
  departure: z.string().optional(),
  arrival: z.string().optional(),
  remarks: z.string().optional(),
  trainingExercises: z.array(exerciseLogSchema).optional(),
}).refine(data => {
    if (data.startHobbs !== undefined && data.endHobbs !== undefined) {
        return data.endHobbs > data.startHobbs;
    }
    return true;
}, {
    message: 'End Hobbs must be greater than Start Hobbs.',
    path: ['endHobbs'],
});

type DebriefFormValues = z.infer<typeof debriefFormSchema>;

interface AddDebriefFormProps {
    student: User;
    onSubmit: (data: Omit<TrainingLogEntry, 'id'>, fromBookingId?: string, logIdToUpdate?: string) => void;
    booking?: Booking;
    logToEdit?: TrainingLogEntry | null;
}

const defaultFormValues: Partial<DebriefFormValues> = {
    date: new Date(),
    aircraft: '',
    startHobbs: 0,
    endHobbs: 0,
    instructorName: '',
    instructorSignature: '',
    studentSignature: '',
    remarks: '',
    trainingExercises: [{ exercise: '', rating: 0, comment: '' }],
};

export function AddDebriefForm({ student, onSubmit, booking, logToEdit }: AddDebriefFormProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  
  const logEntryForBooking = useMemo(() => {
    if (logToEdit) return logToEdit;
    if (!booking || !booking.pendingLogEntryId || !student.trainingLogs) return null;
    return student.trainingLogs.find(log => log.id === booking.pendingLogEntryId);
  }, [booking, student.trainingLogs, logToEdit]);

  const form = useForm<DebriefFormValues>({
    resolver: zodResolver(debriefFormSchema),
    defaultValues: defaultFormValues as DebriefFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "trainingExercises",
  });
  
  useEffect(() => {
    const getInitialValues = () => {
        let remarksFromStorage = '';
        if (booking?.id) {
            try {
                const storedNotes = localStorage.getItem(`inflight-notes-${booking.id}`);
                if (storedNotes) {
                    remarksFromStorage = storedNotes;
                }
            } catch (e) {
                console.warn('Could not access localStorage for in-flight notes.');
            }
        }
        
        // Always check for a log entry in the student's record first
        const associatedLog = logToEdit || (booking?.pendingLogEntryId ? student.trainingLogs?.find(log => log.id === booking.pendingLogEntryId) : null);

        if (associatedLog) {
            return {
                ...associatedLog,
                date: parseISO(associatedLog.date),
                remarks: associatedLog.remarks || remarksFromStorage, // Prioritize DB remarks, fallback to localStorage
                trainingExercises: associatedLog.trainingExercises?.length ? associatedLog.trainingExercises : [{ exercise: '', rating: 0, comment: '' }],
            };
        }

        // If no log entry exists AT ALL, construct from booking data and local storage
        if (booking) {
             return {
                date: parseISO(booking.date),
                aircraft: booking.aircraft,
                startHobbs: booking.startHobbs || 0,
                endHobbs: booking.endHobbs || 0,
                instructorName: booking.instructor || '',
                remarks: remarksFromStorage, // Use local storage notes as the only source
                trainingExercises: [{ exercise: '', rating: 0, comment: '' }],
            };
        }
        
        return defaultFormValues;
    };

    form.reset(getInitialValues() as DebriefFormValues);
  }, [booking, logToEdit, student.trainingLogs, form]);


  function handleFormSubmit(data: DebriefFormValues) {
    const duration = parseFloat(((data.endHobbs || 0) - (data.startHobbs || 0)).toFixed(1));
    
    const newEntry = {
      ...data,
      flightDuration: duration,
      date: format(data.date, 'yyyy-MM-dd'),
      studentSignatureRequired: !data.studentSignature,
    };
    
    const logId = logToEdit?.id || booking?.pendingLogEntryId || `log-${Date.now()}`;
    onSubmit(newEntry, booking?.id, logId);
    
    form.reset();
  }

  const isCurrentUserStudent = currentUser?.id === student.id;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Logbook Details</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                variant={"outline"}
                                                className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                                >
                                                {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) => date > new Date()}
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
                                        <FormControl>
                                            <Input placeholder="e.g., Cessna 172 ZS-ABC" {...field} />
                                        </FormControl>
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
                                        <Input type="number" step="0.1" {...field} />
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
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="instructorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Instructor Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter instructor's name" {...field} />
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
                        <CardTitle>Training Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks & In-Flight Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="In-flight notes will appear here. Add any additional remarks for the overall flight." {...field} className="min-h-[100px] bg-muted" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="font-medium">Exercises Covered</h3>
                             {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                                     <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-2 right-2"
                                        onClick={() => remove(index)}
                                        disabled={fields.length <= 1}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.exercise`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exercise</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger><SelectValue placeholder="Select an exercise" /></SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {trainingExercisesData.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.comment`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exercise Comment</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Add a comment for this exercise..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.rating`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rating</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={(value) => field.onChange(Number(value))}
                                                        value={field.value?.toString()}
                                                        className="flex items-center gap-4"
                                                    >
                                                        {[1, 2, 3, 4].map(rating => (
                                                            <FormItem key={rating} className="flex items-center space-x-2 space-y-0">
                                                                <FormControl>
                                                                    <RadioGroupItem value={String(rating)} />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">{rating}</FormLabel>
                                                            </FormItem>
                                                        ))}
                                                    </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => append({ exercise: '', rating: 0, comment: '' })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Signatures</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <FormField
                                control={form.control}
                                name="instructorSignature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Instructor Signature</FormLabel>
                                        <FormControl>
                                            <SignaturePad onSubmit={field.onChange} signature={field.value}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="studentSignature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Student Signature</FormLabel>
                                        <FormControl>
                                            <div className={cn(!isCurrentUserStudent && "opacity-50 pointer-events-none")}>
                                                <SignaturePad onSubmit={field.onChange} signature={field.value} />
                                            </div>
                                        </FormControl>
                                        {!isCurrentUserStudent && <FormDescription className="text-destructive">Only the student can sign here.</FormDescription>}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg">Save Debrief</Button>
        </div>
      </form>
    </Form>
  );
}
