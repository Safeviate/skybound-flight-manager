

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
import { CalendarIcon, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import type { Aircraft, TrainingLogEntry, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const logbookFormSchema = z.object({
  date: z.date({
    required_error: 'A date is required.',
  }),
  aircraft: z.string().min(1, { message: 'Aircraft details are required.' }),
  departure: z.string().optional(),
  arrival: z.string().optional(),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Use HH:mm format." }).optional().or(z.literal('')),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Use HH:mm format." }).optional().or(z.literal('')),
  startHobbs: z.coerce.number().min(0),
  endHobbs: z.coerce.number().min(0),
  singleEngineTime: z.coerce.number().optional(),
  multiEngineTime: z.coerce.number().optional(),
  fstdTime: z.coerce.number().optional(),
  dualTime: z.coerce.number().optional(),
  singleTime: z.coerce.number().optional(),
  nightTime: z.coerce.number().optional(),
  dayTime: z.coerce.number().optional(),
  instructorName: z.string({
    required_error: 'Please enter the instructor\'s name.',
  }),
  remarks: z.string().optional(),
}).refine(data => data.endHobbs > data.startHobbs, {
    message: 'End Hobbs must be greater than Start Hobbs.',
    path: ['endHobbs'],
}).refine(data => !(data.singleEngineTime && data.multiEngineTime), {
    message: 'Cannot have both Single-Engine and Multi-Engine time.',
    path: ['multiEngineTime'],
}).refine(data => !(data.singleTime && data.dualTime), {
    message: 'Cannot have both Solo and Dual time.',
    path: ['dualTime'],
});

type LogbookFormValues = z.infer<typeof logbookFormSchema>;

interface AddLogbookEntryFormProps {
    onSubmit: (data: Omit<TrainingLogEntry, 'id' | 'trainingExercises'>, logIdToUpdate?: string) => void;
    logToEdit?: TrainingLogEntry | null;
    onDelete?: (logId: string) => void;
}

const defaultFormValues: Partial<LogbookFormValues> = {
    date: new Date(),
    aircraft: '',
    departure: '',
    arrival: '',
    departureTime: '',
    arrivalTime: '',
    startHobbs: 0,
    endHobbs: 0,
    instructorName: '',
    singleEngineTime: 0,
    multiEngineTime: 0,
    fstdTime: 0,
    dualTime: 0,
    singleTime: 0,
    nightTime: 0,
    dayTime: 0,
    remarks: '',
};

export function AddLogbookEntryForm({ onSubmit, logToEdit, onDelete }: AddLogbookEntryFormProps) {
  const { company } = useUser();
  
  const form = useForm<LogbookFormValues>({
    resolver: zodResolver(logbookFormSchema),
    defaultValues: defaultFormValues as LogbookFormValues,
  });
  
  const { setValue, watch } = form;
  const watchedFields = watch();

  useEffect(() => {
    if (logToEdit) {
      form.reset({
        ...logToEdit,
        date: parseISO(logToEdit.date),
      });
    } else {
        form.reset(defaultFormValues as LogbookFormValues);
    }
  }, [logToEdit, form]);
  
   useEffect(() => {
    if (watchedFields.singleEngineTime && watchedFields.singleEngineTime > 0) {
      setValue('multiEngineTime', 0);
    }
  }, [watchedFields.singleEngineTime, setValue]);

  useEffect(() => {
    if (watchedFields.multiEngineTime && watchedFields.multiEngineTime > 0) {
      setValue('singleEngineTime', 0);
    }
  }, [watchedFields.multiEngineTime, setValue]);

  useEffect(() => {
    if (watchedFields.singleTime && watchedFields.singleTime > 0) {
      setValue('dualTime', 0);
    }
  }, [watchedFields.singleTime, setValue]);

  useEffect(() => {
    if (watchedFields.dualTime && watchedFields.dualTime > 0) {
      setValue('singleTime', 0);
    }
  }, [watchedFields.dualTime, setValue]);


  function handleFormSubmit(data: LogbookFormValues) {
    const duration = parseFloat((data.endHobbs - data.startHobbs).toFixed(1));
    const dayTime = duration - (data.nightTime || 0);
    const newEntry = {
      ...data,
      flightDuration: duration,
      dayTime: dayTime,
      date: format(data.date, 'yyyy-MM-dd'),
    };
    onSubmit(newEntry, logToEdit?.id);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-4">
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
                        <FormItem className="flex flex-col">
                            <FormLabel>Aircraft</FormLabel>
                             <FormControl>
                                <Input placeholder="e.g., Cessna 172 ZS-ABC" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="departure" render={({ field }) => (<FormItem><FormLabel>Departure Place</FormLabel><FormControl><Input placeholder="ICAO Code" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="arrival" render={({ field }) => (<FormItem><FormLabel>Arrival Place</FormLabel><FormControl><Input placeholder="ICAO Code" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="departureTime" render={({ field }) => (<FormItem><FormLabel>Departure Time</FormLabel><FormControl><Input placeholder="HH:mm" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="arrivalTime" render={({ field }) => (<FormItem><FormLabel>Arrival Time</FormLabel><FormControl><Input placeholder="HH:mm" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startHobbs" render={({ field }) => (<FormItem><FormLabel>Start Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="endHobbs" render={({ field }) => (<FormItem><FormLabel>End Hobbs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <FormField control={form.control} name="singleTime" render={({ field }) => (<FormItem><FormLabel>Solo Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="dualTime" render={({ field }) => (<FormItem><FormLabel>Dual Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="singleEngineTime" render={({ field }) => (<FormItem><FormLabel>SE Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="multiEngineTime" render={({ field }) => (<FormItem><FormLabel>ME Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="fstdTime" render={({ field }) => (<FormItem><FormLabel>FSTD Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="nightTime" render={({ field }) => (<FormItem><FormLabel>Night Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={form.control} name="dayTime" render={({ field }) => (<FormItem><FormLabel>Day Time</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
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
                name="remarks"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Add any remarks for this flight..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </ScrollArea>
        <div className="flex justify-between pt-4">
            {logToEdit && onDelete && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete Entry
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this logbook entry.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(logToEdit.id)}>
                                Yes, Delete Entry
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
          <Button type="submit" className={cn(!logToEdit && "w-full")}>Save Log Entry</Button>
        </div>
      </form>
    </Form>
  );
}
