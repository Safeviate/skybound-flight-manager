
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const reportFormSchema = z.object({
  reportType: z.string({
    required_error: 'Please select a report type.',
  }),
  occurrenceDate: z.date({
    required_error: 'An occurrence date is required.',
  }),
  occurrenceTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Please enter a valid time in 24-hour HH:mm format.",
  }).optional(),
  aircraftInvolved: z.string().optional(),
  location: z.string().optional(),
  heading: z.string().min(5, { message: "Heading must be at least 5 characters."}),
  details: z.string().min(20, { message: "Details must be at least 20 characters."}),
  isAnonymous: z.boolean().default(false),
  onBehalfOf: z.boolean().default(false),
  onBehalfOfUser: z.string().optional(),
  subCategory: z.string().optional(),
  phaseOfFlight: z.string().optional(),
  lossOfSeparationType: z.string().optional(),
  raCallout: z.string().optional(),
  raNotFollowedReason: z.string().optional(),
}).refine(data => {
    if (data.onBehalfOf) {
        return !!data.onBehalfOfUser;
    }
    return true;
}, {
    message: "You must select a user when filing on their behalf.",
    path: ['onBehalfOfUser'],
});


type ReportFormValues = z.infer<typeof reportFormSchema>;

interface NewSafetyReportFormProps {
    onSubmit: (data: any) => void;
}

export function NewSafetyReportForm({ onSubmit }: NewSafetyReportFormProps) {
    const { user, company } = useUser();
    const [personnel, setPersonnel] = useState<User[]>([]);

    useEffect(() => {
        const fetchPersonnel = async () => {
            if (!company) return;
            const q = query(collection(db, `companies/${company.id}/users`));
            const snapshot = await getDocs(q);
            setPersonnel(snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as User)));
        }
        fetchPersonnel();
    }, [company]);
  
    const form = useForm<ReportFormValues>({
        resolver: zodResolver(reportFormSchema),
        defaultValues: {
            occurrenceDate: new Date(),
            occurrenceTime: format(new Date(), 'HH:mm'),
            isAnonymous: false,
            onBehalfOf: false,
            heading: '',
            details: '',
            subCategory: '',
            phaseOfFlight: '',
            lossOfSeparationType: '',
            raCallout: '',
            raNotFollowedReason: '',
            aircraftInvolved: '',
            location: '',
        }
    });

    const onBehalfOfChecked = form.watch('onBehalfOf');
    const isAnonymousChecked = form.watch('isAnonymous');

    useEffect(() => {
        if (isAnonymousChecked && onBehalfOfChecked) {
            form.setValue('onBehalfOf', false);
        }
    }, [isAnonymousChecked, onBehalfOfChecked, form]);

    function handleFormSubmit(data: ReportFormValues) {
        onSubmit(data);
    }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Initial Details</CardTitle>
                    <CardDescription>Start by providing the basic information about the occurrence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="md:col-span-3">
                            <FormField
                            control={form.control}
                            name="reportType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Report Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a report type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Flight Operations Report">Flight Operations Report</SelectItem>
                                    <SelectItem value="Ground Operations Report">Ground Operations Report</SelectItem>
                                    <SelectItem value="Aircraft Defect Report">Aircraft Defect Report</SelectItem>
                                    <SelectItem value="Occupational Report">Occupational Report</SelectItem>
                                    <SelectItem value="General Report">General Report</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-2">
                            <FormField
                                control={form.control}
                                name="occurrenceDate"
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
                                    name="occurrenceTime"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Time (24h)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="time"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                    <CardDescription>Describe the event in as much detail as possible.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="aircraftInvolved"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aircraft Involved (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., N12345" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="location"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Location (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., KPAO, Gate 14, Maintenance Hangar" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="heading"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Report Heading</FormLabel>
                            <FormControl>
                                <Input placeholder="A brief, one-line summary of the event" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="details"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Details of Occurrence</FormLabel>
                            <FormControl>
                                <Textarea className="min-h-32" placeholder="Provide a full description of the event..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Submission Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="isAnonymous"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                File Anonymously
                                </FormLabel>
                                <FormDescription>
                                If checked, your name will not be attached to this report.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="onBehalfOf"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isAnonymousChecked}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                File on behalf of another user
                                </FormLabel>
                                <FormDescription>
                                 Select this if you are filing this report for someone else.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                    />
                    {onBehalfOfChecked && (
                         <FormField
                            control={form.control}
                            name="onBehalfOfUser"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Person Reporting</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a person" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {personnel.map((p) => (
                                        <SelectItem key={p.id} value={`${p.name}`}>
                                            {p.name} ({p.department || p.role})
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit">Submit Report</Button>
            </div>
        </form>
    </Form>
  );
}
