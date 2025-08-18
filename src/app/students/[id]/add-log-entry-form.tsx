

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

const logEntryFormSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  departure: z.string().optional(),
  arrival: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  startHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  endHobbs: z.coerce.number().min(0, {
      message: 'Hobbs hours must be a positive number.'
  }),
  singleEngineTime: z.coerce.number().optional(),
  multiEngineTime: z.coerce.number().optional(),
  dualTime: z.coerce.number().optional(),
  singleTime: z.coerce.number().optional(),
  nightTime: z.coerce.number().optional(),
  instructorName: z.string({
    required_error: 'Please enter the instructor\'s name.',
  }),
  trainingExercises: z.array(exerciseLogSchema).min(1, 'At least one exercise must be logged.'),
  weatherConditions: z.string().optional(),
  instructorSignature: z.string().min(1, 'Instructor signature is required.'),
  studentSignature: z.string().min(1, 'Student signature is required.'),
}).refine(data => data.endHobbs > data.startHobbs, {
    message: 'End Hobbs must be greater than Start Hobbs.',
    path: ['endHobbs'],
});

type LogEntryFormValues = z.infer<typeof logEntryFormSchema>;

interface AddLogEntryFormProps {
    student: User;
    onSubmit: (data: Omit<TrainingLogEntry, 'id'>, fromBookingId?: string, logIdToUpdate?: string) => void;
    booking?: Booking;
    logToEdit?: TrainingLogEntry | null;
}

const defaultFormValues: Partial<LogEntryFormValues> = {
    date: new Date(),
    aircraft: '',
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
    startHobbs: 0,
    endHobbs: 0,
    instructorName: '',
    trainingExercises: [{ exercise: '', rating: 0, comment: '' }],
    weatherConditions: '',
    instructorSignature: '',
    studentSignature: '',
    singleEngineTime: 0,
    multiEngineTime: 0,
    dualTime: 0,
    singleTime: 0,
    nightTime: 0,
};

export function AddLogEntryForm({ student, onSubmit, booking, logToEdit }: AddLogEntryFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);

  const logEntryForBooking = useMemo(() => {
    if (logToEdit) return logToEdit;
    if (!booking || !booking.pendingLogEntryId || !student.trainingLogs) return null;
    return student.trainingLogs.find(log => log.id === booking.pendingLogEntryId);
  }, [booking, student.trainingLogs, logToEdit]);

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntryFormSchema),
    defaultValues: defaultFormValues as LogEntryFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "trainingExercises",
  });
  
  useEffect(() => {
      const getInitialValues = () => {
          if (logToEdit) {
              return {
                  ...logToEdit,
                  date: parseISO(logToEdit.date),
              };
          }
          if (booking) {
              return {
                  date: parseISO(booking.date),
                  aircraft: booking.aircraft,
                  startHobbs: booking.startHobbs || 0,
                  endHobbs: booking.endHobbs || 0,
                  instructorName: booking.instructor || '',
                  departure: booking.departure || '',
                  arrival: booking.arrival || '',
                  departureTime: booking.startTime,
                  arrivalTime: booking.endTime,
                  trainingExercises: logEntryForBooking?.trainingExercises.length ? logEntryForBooking.trainingExercises : [{ exercise: '', rating: 0, comment: '' }],
              };
          }
          return defaultFormValues;
      };

      form.reset(getInitialValues() as LogEntryFormValues);
  }, [booking, logToEdit, logEntryForBooking, form]);


  const { watch, setValue } = form;
  const startHobbs = watch('startHobbs');
  const endHobbs = watch('endHobbs');

  const lessonDuration = useMemo(() => {
    if (typeof startHobbs === 'number' && typeof endHobbs === 'number' && endHobbs > startHobbs) {
        return endHobbs - startHobbs;
    }
    return 0;
  }, [startHobbs, endHobbs]);
  
  const totalFlightHours = useMemo(() => {
      const existingHours = student?.trainingLogs?.reduce((total, log) => {
          if (logEntryForBooking && log.id === logEntryForBooking.id) {
              return total;
          }
          return total + (log.flightDuration || 0);
      }, 0) || 0;
      return existingHours;
  }, [student?.trainingLogs, logEntryForBooking]);
  
  useEffect(() => {
    const fetchData = async () => {
        if (!company) return;
        const acQuery = query(collection(db, `companies/${company.id}/aircraft`), where('status', '!=', 'Archived'));
        const acSnapshot = await getDocs(acQuery);
        setAircraftList(acSnapshot.docs.map(doc => doc.data() as Aircraft));
    };
    fetchData();
  }, [company]);

  function handleFormSubmit(data: LogEntryFormValues) {
    const duration = parseFloat((data.endHobbs - data.startHobbs).toFixed(1));
    
    const newEntry = {
      ...data,
      flightDuration: duration,
      date: format(data.date, 'yyyy-MM-dd'),
    };
    
    onSubmit(newEntry, booking?.id, logToEdit?.id);
    
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Training Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="instructorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Instructor Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., John Doe" {...field} />
                                        </FormControl>
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
                        <Separator />
                        <div className="space-y-4">
                            <FormLabel>Exercises Covered</FormLabel>
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg space-y-2 relative">
                                    <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.exercise`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="sr-only">Exercise</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select exercise..." /></SelectTrigger></FormControl>
                                                    <SelectContent>{trainingExercisesData.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.rating`}
                                        render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Performance Rating</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                                                    defaultValue={String(field.value)}
                                                    className="flex flex-wrap items-center gap-x-4 gap-y-2"
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="1" /></FormControl><FormLabel className="font-normal">1 (Poor)</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="2" /></FormControl><FormLabel className="font-normal">2 (Avg)</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="3" /></FormControl><FormLabel className="font-normal">3 (Good)</FormLabel></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="4" /></FormControl><FormLabel className="font-normal">4 (Excep.)</FormLabel></FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                    <FormField
                                        control={form.control}
                                        name={`trainingExercises.${index}.comment`}
                                        render={({ field }) => (
                                            <FormItem>
                                                 <FormLabel className="sr-only">Comment</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Add a comment for this exercise..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" className="w-full" onClick={() => append({ exercise: '', rating: 0, comment: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Exercise
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
                                            <SignaturePad onSubmit={field.onChange} />
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
                                            <SignaturePad onSubmit={field.onChange} />
                                        </FormControl>
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
