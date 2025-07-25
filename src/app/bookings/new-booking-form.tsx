
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
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Booking, Aircraft, User } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';
import { useUser } from '@/context/user-provider';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const bookingFormSchema = z.object({
  aircraft: z.string({
    required_error: 'Please select an aircraft.',
  }),
  student: z.string().optional(),
  instructor: z.string().optional(),
  date: z.date({
    required_error: 'A date is required.',
  }),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  purpose: z.enum(['Training', 'Maintenance', 'Private'], {
    required_error: 'Please select a purpose.',
  }),
  trainingExercise: z.string().optional(),
}).refine(data => {
    if (data.purpose !== 'Maintenance') {
        return data.startTime && timeRegex.test(data.startTime);
    }
    return true;
}, {
    message: "Start time is required and must be in HH:mm format.",
    path: ["startTime"],
}).refine(data => {
    if (data.purpose !== 'Maintenance') {
        return data.endTime && timeRegex.test(data.endTime);
    }
    return true;
}, {
    message: "End time is required and must be in HH:mm format.",
    path: ["endTime"],
}).refine(data => {
    if (data.purpose !== 'Maintenance' && data.startTime && data.endTime) {
        return data.endTime > data.startTime;
    }
    return true;
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
});


type BookingFormValues = z.infer<typeof bookingFormSchema>;

interface NewBookingFormProps {
    onBookingCreated: (newBooking: Omit<Booking, 'id'>) => void;
}

export function NewBookingForm({ onBookingCreated }: NewBookingFormProps) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const { user, company } = useUser();
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
        aircraft: '',
        student: '',
        instructor: '',
        trainingExercise: '',
    }
  });

  const [aircraftData, setAircraftData] = useState<Aircraft[]>([]);
  const [userData, setUserData] = useState<User[]>([]);
  const [trainingExercisesData, setTrainingExercisesData] = useState<string[]>([]); // Assuming this could be dynamic too
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
      from: new Date(),
      to: addDays(new Date(), 4)
  });

  useEffect(() => {
    if (!company) return;
    const fetchPrerequisites = async () => {
        try {
            const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
            const aircraftSnapshot = await getDocs(aircraftQuery);
            setAircraftData(aircraftSnapshot.docs.map(doc => doc.data() as Aircraft));

            const usersQuery = query(collection(db, `companies/${company.id}/users`));
            const usersSnapshot = await getDocs(usersQuery);
            setUserData(usersSnapshot.docs.map(doc => doc.data() as User));
            
            // Example for training exercises if they were in Firestore
            // const exercisesQuery = query(collection(db, `companies/${company.id}/training-exercises`));
            // const exercisesSnapshot = await getDocs(exercisesQuery);
            // setTrainingExercisesData(exercisesSnapshot.docs.map(doc => doc.data().name));
        } catch (error) {
            console.error("Failed to fetch form prerequisites", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load data for form.' });
        }
    };
    fetchPrerequisites();
  }, [company, toast]);
  
  useEffect(() => {
    if (dateRange?.from) form.setValue('date', dateRange.from);
    if (dateRange?.to) form.setValue('endDate', dateRange.to);
  }, [dateRange, form]);

  const purpose = form.watch('purpose');

  function onSubmit(data: BookingFormValues) {
    if (!company) return;
    const status = 'Approved';

    const newBooking: Omit<Booking, 'id'> = {
        ...data,
        companyId: company.id,
        date: format(data.date, 'yyyy-MM-dd'),
        endDate: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : undefined,
        status,
        startTime: data.startTime || '00:00',
        endTime: data.endTime || '23:59',
        student: data.student || 'N/A',
        instructor: data.instructor || 'N/A',
    };
    onBookingCreated(newBooking);
    
    toast({
      title: 'Booking Confirmed',
      description: `Your booking has been confirmed.`,
    });
  }
  
  const today = new Date('2024-08-15');
  today.setHours(0, 0, 0, 0);

  const availableAircraft = aircraftData.filter(ac => {
    const airworthinessExpired = isBefore(parseISO(ac.airworthinessExpiry), today);
    const insuranceExpired = isBefore(parseISO(ac.insuranceExpiry), today);
    const isAvailable = settings.enforcePostMaintenanceCheck ? ac.status === 'Available' : ac.status !== 'In Maintenance';
    return isAvailable && !airworthinessExpired && !insuranceExpired;
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
        {purpose !== 'Maintenance' && (
            <>
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
            </>
        )}
        <div className="flex gap-4">
            {purpose === 'Maintenance' ? (
                <FormItem className="flex flex-col flex-1">
                    <FormLabel>Maintenance Date Range</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            disabled={(date) => date < new Date()}
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            ) : (
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
            )}
        </div>
        {purpose !== 'Maintenance' && (
            <div className="flex gap-4">
                <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col flex-1">
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                            <Input placeholder="14:00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col flex-1">
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                            <Input placeholder="15:30" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        )}
        <div className="flex justify-end pt-4">
            <Button type="submit">Create Booking</Button>
        </div>
      </form>
    </Form>
  );
}
