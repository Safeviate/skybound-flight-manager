

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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import type { User, SafetyReport } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ICAO_PHASES_OF_FLIGHT } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  details: z.string().min(20, { message: 'The event description must be at least 20 characters long.' }),
  isAnonymous: z.boolean().default(false).optional(),
  onBehalfOf: z.boolean().default(false),
  onBehalfOfUser: z.string().optional(),
  
  // Conditional fields
  phaseOfFlight: z.string().optional(),
  systemOrComponent: z.string().optional(),
  aircraftGrounded: z.boolean().optional(),
  areaOfOperation: z.string().optional(),
  groundEventType: z.string().optional(),
  injuryType: z.string().optional(),
  medicalAttentionRequired: z.boolean().optional(),
  subCategory: z.string().optional(),
  raCallout: z.string().optional(),
  raFollowed: z.enum(['Yes', 'No']).optional(),
}).refine(data => {
    if (data.onBehalfOf) {
        return !!data.onBehalfOfUser;
    }
    return true;
}, {
    message: "You must select a user when filing on their behalf.",
    path: ['onBehalfOfUser'],
}).refine(data => {
    if (data.reportType === 'Aircraft Defect Report') {
        return !!data.aircraftInvolved;
    }
    return true;
}, {
    message: "Aircraft must be specified for a defect report.",
    path: ['aircraftInvolved'],
});


type ReportFormValues = z.infer<typeof reportFormSchema>;

interface NewSafetyReportFormProps {
    onSubmit: (data: Omit<SafetyReport, 'id' | 'status' | 'filedDate' | 'reportNumber' | 'companyId'>) => void;
}

const groundOpAreas = ['Ramp/Apron', 'Taxiway', 'Hangar', 'Fuel Bay', 'Storage Area'];
const groundOpEvents = ['Vehicle Incident', 'Ground Handling Issue', 'Fuel Spill', 'Foreign Object Debris (FOD)', 'Security Breach'];
const occupationalInjuryTypes = ['Slip/Trip/Fall', 'Manual Handling/Lifting', 'Hazardous Substance Exposure', 'Ergonomic Issue', 'Laceration/Cut', 'Other'];
const flightOpOccurrenceTypes = ['Loss of Separation / Airprox', 'Bird Strike', 'System/Component Failure (In-Flight)', 'Weather-Related Occurrence', 'Runway Event', 'Other'];
const losSubcategories = ['Close Proximity', 'Traffic Advisory (TA)', 'Resolution Advisory (RA)'];
const raCallouts = ['Climb', 'Descend', 'Maintain Vertical Speed', 'Level Off', 'Increase Climb', 'Increase Descent', 'Climb, Crossing Climb', 'Descend, Crossing Descend'];

const defaultValues = {
    occurrenceDate: new Date(),
    occurrenceTime: format(new Date(), 'HH:mm'),
    onBehalfOf: false,
    isAnonymous: false,
    phaseOfFlight: '',
    aircraftInvolved: '',
    location: '',
    details: '',
};

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
        defaultValues: defaultValues
    });

    const onBehalfOfChecked = form.watch('onBehalfOf');
    const reportType = form.watch('reportType');
    const specificOccurrenceType = form.watch('phaseOfFlight'); // Re-using for specific type
    const losSubcategory = form.watch('subCategory');

    function handleFormSubmit(data: ReportFormValues) {
        let submittedBy = data.isAnonymous ? 'Anonymous' : user?.name || 'Anonymous';
        if (data.onBehalfOf && data.onBehalfOfUser) {
            const selectedUser = personnel.find(p => p.id === data.onBehalfOfUser);
            submittedBy = selectedUser?.name || user?.name || 'Error';
        }

        onSubmit({
            ...data,
            submittedBy, // Pass the correct name
        } as Omit<SafetyReport, 'id' | 'status' | 'filedDate' | 'reportNumber' | 'companyId'>);
    }
    
    const handleReset = () => {
        form.reset(defaultValues);
    }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                    <CardDescription>Start by providing the basic information about the occurrence.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="reportType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Type of report</FormLabel>
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
                         <FormItem>
                            <FormLabel>Date & Time of Occurrence</FormLabel>
                            <div className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name="occurrenceDate"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
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
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="time"
                                                    className="w-[100px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                         </FormItem>
                    </div>
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
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., KPAO, Gate 14, Maintenance Hangar" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     {reportType === 'Flight Operations Report' && (
                        <div className="space-y-4 pt-4 border-t">
                            <FormField
                                control={form.control}
                                name="phaseOfFlight"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Specific Occurrence Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a specific occurrence type" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {flightOpOccurrenceTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                            {type}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {specificOccurrenceType === 'Loss of Separation / Airprox' && (
                                <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="subCategory"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Event Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select LOS event type" /></SelectTrigger></FormControl>
                                                <SelectContent>{losSubcategories.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {losSubcategory === 'Resolution Advisory (RA)' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="raCallout"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>RA Callout</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select callout" /></SelectTrigger></FormControl>
                                                            <SelectContent>{raCallouts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={form.control}
                                                name="raFollowed"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel>Was RA Followed?</FormLabel>
                                                        <FormControl>
                                                            <RadioGroup
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                            className="flex items-center space-x-4 pt-2"
                                                            >
                                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                                <FormControl><RadioGroupItem value="Yes" /></FormControl>
                                                                <FormLabel className="font-normal">Yes</FormLabel>
                                                            </FormItem>
                                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                                <FormControl><RadioGroupItem value="No" /></FormControl>
                                                                <FormLabel className="font-normal">No</FormLabel>
                                                            </FormItem>
                                                            </RadioGroup>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {reportType === 'Aircraft Defect Report' && (
                        <div className="space-y-4 pt-4 border-t">
                            <FormField
                                control={form.control}
                                name="systemOrComponent"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>System or Component</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Left Main Landing Gear" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="aircraftGrounded"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Aircraft Grounded?</FormLabel>
                                            <FormDescription>Is the aircraft unserviceable as a result of this defect?</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                    
                    {reportType === 'Ground Operations Report' && (
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                           <FormField
                                control={form.control}
                                name="areaOfOperation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Area of Operation</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger></FormControl>
                                            <SelectContent>{groundOpAreas.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="groundEventType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger></FormControl>
                                            <SelectContent>{groundOpEvents.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                    {reportType === 'Occupational Report' && (
                        <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                            <FormField
                                control={form.control}
                                name="injuryType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type of Injury/Hazard</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select injury type" /></SelectTrigger></FormControl>
                                            <SelectContent>{occupationalInjuryTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="medicalAttentionRequired"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-2.5">
                                        <div className="space-y-0.5">
                                            <FormLabel>Medical Attention Required?</FormLabel>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Event Description</CardTitle>
                    <CardDescription>
                        Describe the event in detail. Include what happened, where it happened, and who was involved.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="details"
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Textarea
                                    placeholder="Provide a detailed description of the event..."
                                    className="min-h-[200px]"
                                    {...field}
                                />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    {onBehalfOfChecked && (
                         <FormField
                            control={form.control}
                            name="onBehalfOfUser"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Person Reporting</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a person" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {personnel.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
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
                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleReset}>Reset Form</Button>
                    <Button type="submit">Submit Report</Button>
                </CardFooter>
            </Card>
        </form>
    </Form>
  );
}


