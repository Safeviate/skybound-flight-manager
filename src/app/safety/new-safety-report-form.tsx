
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
import { Textarea } from '@/components/ui/textarea';
import type { Aircraft, SafetyReport, SafetyReportType } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Bot, Loader2, AlertTriangle, CheckCircle, Info, BarChart } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { ICAO_PHASES_OF_FLIGHT } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { analyzeSafetyReportTone } from '@/ai/flows/analyze-safety-report-tone';
import type { AnalyzeSafetyReportToneOutput } from '@/ai/flows/analyze-safety-report-tone';

const flightOpsSubCategories = [
    'Airspace Violation',
    'Runway Incursion/Excursion',
    'Loss of Separation',
    'Unstable Approach',
    'Go-Around',
    'Bird Strike',
    'Weather Related Incident',
    'Aircraft System Malfunction',
    'Passenger Related Incident',
    'Air Traffic Control (ATC) Issue',
    'Other',
];

const lossOfSeparationTypes = [
    'Close Proximity',
    'Resolution Advisory',
    'Traffic Alert',
];

const raCalloutTypes = [
    'Climb',
    'Descend',
    'Maintain Vertical Speed, Maintain',
    'Level Off, Level Off',
    'Monitor Vertical Speed',
    'Increase Climb',
    'Increase Descent',
    'Climb, Crossing Climb',
    'Descend, Crossing Descend',
];

const reportFormSchema = z.object({
  occurrenceDate: z.date({
    required_error: 'An occurrence date is required.',
  }),
  occurrenceTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: "Please enter a valid time in 24-hour HH:mm format.",
  }).optional(),
  reportType: z.enum(['Flight Operations Report', 'Ground Operations Report', 'Occupational Report', 'General Report', 'Aircraft Defect Report'], {
    required_error: 'Please select a report type.',
  }),
  heading: z.string().min(5, {
    message: 'Heading must be at least 5 characters long.',
  }),
  subCategory: z.string().optional(),
  phaseOfFlight: z.string().optional(),
  lossOfSeparationType: z.string().optional(),
  raCallout: z.string().optional(),
  raFollowed: z.enum(['Yes', 'No']).optional(),
  raNotFollowedReason: z.string().optional(),
  aircraftInvolved: z.string().optional(),
  location: z.string().optional(),
  details: z.string().min(20, {
    message: 'Details must be at least 20 characters long.',
  }),
  isAnonymous: z.boolean().default(false).optional(),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface NewSafetyReportFormProps {
    safetyReports: SafetyReport[];
    onSubmit: (newReport: Omit<SafetyReport, 'id' | 'submittedBy' | 'status' | 'filedDate' | 'department'> & { isAnonymous?: boolean }) => void;
}

const getReportTypeAbbreviation = (type: SafetyReportType) => {
    switch (type) {
        case 'Flight Operations Report': return 'FOR';
        case 'Ground Operations Report': return 'GOR';
        case 'Occupational Report': return 'OR';
        case 'General Report': return 'GR';
        case 'Aircraft Defect Report': return 'ADR';
        default: return 'REP';
    }
}

const AnalysisResult = ({ data }: { data: AnalyzeSafetyReportToneOutput }) => {
    const resultItems = [
        { title: "Overall Tone", value: data.overallTone, icon: <Info className="text-primary"/> },
        { title: "Severity Level", value: data.severityLevel, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Potential Safety Issues", value: data.potentialSafetyIssues, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Areas for Investigation", value: data.areasForInvestigation, icon: <Info className="text-primary"/> },
        { title: "Compliance Concerns", value: data.complianceConcerns, icon: <CheckCircle className="text-green-600"/> },
        { title: "Impact on Operations", value: data.impactOnOperations, icon: <BarChart className="text-primary"/> },
    ];
  return (
    <Card className="bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
            <Bot /> AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
        {resultItems.map(item => (
            <div key={item.title} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.value}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function NewSafetyReportForm({ safetyReports, onSubmit }: NewSafetyReportFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [aircraftData, setAircraftData] = useState<Aircraft[]>([]);
  const [airportData, setAirportData] = useState<any[]>([]); // Assuming airport data structure
  
  const [analysis, setAnalysis] = useState<AnalyzeSafetyReportToneOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
        occurrenceDate: new Date(),
        occurrenceTime: format(new Date(), 'HH:mm'),
        isAnonymous: false,
        heading: '',
        details: '',
        subCategory: '',
        phaseOfFlight: '',
        lossOfSeparationType: '',
        raCallout: '',
        raFollowed: undefined,
        raNotFollowedReason: '',
        aircraftInvolved: '',
        location: '',
    }
  });
  
  const detailsValue = form.watch('details');

  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): void => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const triggerAnalysis = useCallback(debounce(async (reportText: string) => {
    if (reportText.length < 50) {
        setAnalysis(null);
        return;
    };
    setIsAnalyzing(true);
    try {
        const result = await analyzeSafetyReportTone({ reportText });
        setAnalysis(result);
    } catch (error) {
        console.error("AI analysis failed:", error);
        toast({ variant: 'destructive', title: 'AI Analysis Error', description: 'Could not analyze report text.' });
    } finally {
        setIsAnalyzing(false);
    }
  }, 1000), [toast]);


  useEffect(() => {
      triggerAnalysis(detailsValue);
  }, [detailsValue, triggerAnalysis]);


  useEffect(() => {
    async function fetchData() {
      if (!company) return;
      try {
        const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
        const aircraftSnapshot = await getDocs(aircraftQuery);
        setAircraftData(aircraftSnapshot.docs.map(doc => doc.data() as Aircraft));
        
      } catch (error) {
        console.error("Error fetching data for form:", error);
      }
    }
    fetchData();
  }, [company]);


  const reportType = form.watch('reportType');
  const subCategory = form.watch('subCategory');
  const lossOfSeparationType = form.watch('lossOfSeparationType');
  const raFollowed = form.watch('raFollowed');

  function handleFormSubmit(data: ReportFormValues) {
    const reportTypeAbbr = getReportTypeAbbreviation(data.reportType);
    const reportsOfType = safetyReports.filter(r => r.reportNumber.startsWith(reportTypeAbbr));
    const nextId = reportsOfType.length + 1;
    const reportNumber = `${reportTypeAbbr}-${String(nextId).padStart(3, '0')}`;

    const newReport = {
        ...data,
        reportNumber,
        occurrenceDate: format(data.occurrenceDate, 'yyyy-MM-dd'),
    };
    
    onSubmit(newReport);
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Initial Details</CardTitle>
                    <CardDescription>Start by providing the basic information about the occurrence.</CardDescription>
                </CardHeader>
                <CardContent>
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

            {reportType === 'Flight Operations Report' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Event Classification</CardTitle>
                        <CardDescription>Provide specific details about the flight operations event.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="subCategory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Flight Operations Sub-Category</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a sub-category" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {flightOpsSubCategories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phaseOfFlight"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phase of Flight</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the phase of flight" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ICAO_PHASES_OF_FLIGHT.map(phase => (
                                                    <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         {subCategory === 'Loss of Separation' && (
                            <FormField
                                control={form.control}
                                name="lossOfSeparationType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type of Separation Loss</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the type of separation loss" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {lossOfSeparationTypes.map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        {lossOfSeparationType === 'Resolution Advisory' && (
                            <>
                            <FormField
                                control={form.control}
                                name="raCallout"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>RA Callout</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select the RA callout" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {raCalloutTypes.map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="raFollowed"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>RA Followed</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Was the Resolution Advisory followed?" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {raFollowed === 'No' && (
                                <FormField
                                    control={form.control}
                                    name="raNotFollowedReason"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Reason RA Not Followed</FormLabel>
                                        <FormControl>
                                            <Textarea
                                            placeholder="Explain why the Resolution Advisory was not followed..."
                                            className="min-h-[100px]"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Report Details</CardTitle>
                    <CardDescription>Describe the event in as much detail as possible.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="aircraftInvolved"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Aircraft Involved (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an aircraft if applicable" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {aircraftData.map((ac) => (
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
                                <Input placeholder="e.g., Unstable Approach and Hard Landing" {...field} />
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
                            <Textarea
                                placeholder="Provide a detailed, narrative description of the event. Include what happened, where it happened, who was involved, and what the conditions were..."
                                className="min-h-[150px]"
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {(isAnalyzing || analysis) && (
                <div className="relative">
                    {isAnalyzing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Analyzing...</span>
                        </div>
                    )}
                    {analysis && <AnalysisResult data={analysis} />}
                </div>
            )}
            
             <Card>
                <CardHeader>
                    <CardTitle>Submission</CardTitle>
                </CardHeader>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="isAnonymous"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-yellow-200 dark:bg-yellow-200/30">
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
                            <p className="text-xs text-muted-foreground">
                                If checked, your name will not be attached to this report.
                            </p>
                            </div>
                        </FormItem>
                        )}
                    />
                </CardContent>
             </Card>
            <Button type="submit" variant="destructive" className="w-full">Submit Report</Button>
        </form>
    </Form>
  );
}
