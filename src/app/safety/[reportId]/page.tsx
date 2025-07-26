

'use client';

import { useEffect, useState, useActionState } from 'react';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Risk, SafetyReport, User } from '@/lib/types';
import { ArrowLeft, Mail, Printer, Info, Wind, Bird, Bot, Loader2, BookOpen, Send, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvestigationTeamForm } from './investigation-team-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ICAO_OCCURRENCE_CATEGORIES } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';
import { ICAO_CODE_DEFINITIONS } from '@/lib/icao-codes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InvestigationStepsGenerator } from './investigation-steps-generator';
import { FiveWhysGenerator } from './five-whys-generator';
import { MitigatedRiskAssessment } from './mitigated-risk-assessment';
import { CorrectiveActionPlanGenerator } from './corrective-action-plan-generator';
import { FinalReview } from './final-review';
import { DiscussionSection } from './discussion-section';
import { suggestIcaoCategoryAction } from './actions';
import { InitialRiskAssessment } from './initial-risk-assessment';
import { InvestigationDiary } from './investigation-diary';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import type { DiscussionEntry, InvestigationDiaryEntry } from '@/lib/types';


const getStatusVariant = (status: SafetyReport['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Closed': return 'success';
    default: return 'outline';
  }
};

const ICAO_OPTIONS = ICAO_OCCURRENCE_CATEGORIES.map(code => ({ 
    value: code, 
    label: code,
    description: ICAO_CODE_DEFINITIONS[code] || 'No definition available.'
}));

const CLASSIFICATION_OPTIONS = ['Hazard', 'Occurrence', 'Incident', 'Accident'];

const SCF_SUBCATEGORIES = ['Landing Gear', 'Flight Controls', 'Hydraulics', 'Electrical', 'Avionics', 'Navigation', 'Other'];
const LOS_SUBCATEGORIES = ['Close Proximity', 'Traffic Advisory (TA)', 'Resolution Advisory (RA)'];
const RA_CALLOUTS = ['Climb', 'Descend', 'Maintain Vertical Speed', 'Level Off', 'Increase Climb', 'Increase Descent', 'Climb, Crossing Climb', 'Descend, Crossing Descend'];
const WEATHER_RELATED_CATEGORIES = ['WSTRW', 'TURB', 'ICE', 'CFIT', 'LOC-I', 'RI', 'RE', 'LALT', 'UIMC'];

const BIRD_STRIKE_PARTS = ['Radome', 'Windshield', 'Nose', 'Engine No. 1', 'Engine No. 2', 'Propeller', 'Wing/Rotor', 'Fuselage', 'Landing Gear', 'Tail', 'Lights', 'Other'];
const BIRD_NUMBERS = ['1', '2-10', '11-100', 'More than 100'];
const BIRD_SIZES = ['Small', 'Medium', 'Large'];


const WeatherInputGroup = ({ report, onUpdate }: { report: SafetyReport, onUpdate: (updatedReport: SafetyReport, showToast?: boolean) => void }) => {
  return (
    <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
      <label className="text-sm font-medium block flex items-center gap-2">
        <Wind className="h-4 w-4" />
        Weather Information
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input 
          placeholder="Visibility (e.g., 5 SM)" 
          value={report.visibility || ''}
          onChange={e => onUpdate({ ...report, visibility: Number(e.target.value) }, false)}
        />
        <Input 
          placeholder="Wind Speed (knots)" 
          value={report.windSpeed || ''}
          onChange={e => onUpdate({ ...report, windSpeed: Number(e.target.value) }, false)}
        />
        <Input 
          placeholder="Wind Direction" 
          value={report.windDirection || ''}
          onChange={e => onUpdate({ ...report, windDirection: Number(e.target.value) }, false)}
        />
      </div>
       <Textarea 
          placeholder="Describe overall weather conditions (e.g., METAR, general description)..."
          value={report.weatherConditions || ''}
          onChange={e => onUpdate({ ...report, weatherConditions: e.target.value }, false)}
        />
    </div>
  );
};

const discussionFormSchema = z.object({
  recipient: z.string().min(1, 'You must select a recipient.'),
  message: z.string().min(1, 'Message cannot be empty.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;

const diaryFormSchema = z.object({
  entryText: z.string().min(1, 'Diary entry cannot be empty.'),
});

type DiaryFormValues = z.infer<typeof diaryFormSchema>;

function SafetyReportInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading } = useUser();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();
  
  const [icaoState, icaoFormAction] = useActionState(suggestIcaoCategoryAction, { message: '', data: null });
  const [isIcaoLoading, setIsIcaoLoading] = React.useState(false);

  const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = React.useState(false);
  const [isDiaryDialogOpen, setIsDiaryDialogOpen] = React.useState(false);
  const [personnel, setPersonnel] = React.useState<User[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    
    async function fetchReport() {
        if (!company || !reportId) return;
        setDataLoading(true);
        try {
            const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
            const reportSnap = await getDoc(reportRef);

            if (reportSnap.exists()) {
                const reportData = reportSnap.data() as SafetyReport;
                setReport(reportData);
            } else {
                console.error("No such document!");
                setReport(null);
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch safety report.' });
        } finally {
            setDataLoading(false);
        }
    }
    
    async function fetchPersonnel() {
      if (!company) return;
      const usersRef = collection(db, `companies/${company.id}/users`);
      const snapshot = await getDocs(usersRef);
      setPersonnel(snapshot.docs.map(doc => doc.data() as User));
    };

    fetchReport();
    fetchPersonnel();
  }, [reportId, company, user, loading, router, toast]);

  const discussionForm = useForm<DiscussionFormValues>({
    resolver: zodResolver(discussionFormSchema),
  });
  
  const diaryForm = useForm<DiaryFormValues>({
    resolver: zodResolver(diaryFormSchema),
  });

  const availableRecipients = React.useMemo(() => {
    if (!personnel || personnel.length === 0 || !report) {
      return [];
    }
    return personnel.filter(
      (u) => report.investigationTeam?.includes(u.name) && u.name !== user?.name
    );
  }, [personnel, report, user]);

  const handleNewDiscussionMessage = (data: DiscussionFormValues) => {
    if (!user || !report) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: DiscussionEntry = {
        id: `d-${Date.now()}`,
        author: user.name,
        datePosted: new Date().toISOString(),
        ...data,
        replyByDate: data.replyByDate ? data.replyByDate.toISOString() : undefined,
    };
    
    const updatedReport = {
        ...report,
        discussion: [...(report.discussion || []), newEntry],
    };

    handleReportUpdate(updatedReport, true);
    discussionForm.reset();
    setIsDiscussionDialogOpen(false);
    toast({
      title: 'Message Sent',
      description: `Your message has been sent to ${data.recipient}.`,
    });
  }
  
  const handleNewDiaryEntry = (data: DiaryFormValues) => {
    if (!user || !report) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: InvestigationDiaryEntry = {
        id: `diary-${Date.now()}`,
        author: user.name,
        date: new Date().toISOString(),
        entryText: data.entryText,
    };
    
    const updatedReport = {
        ...report,
        investigationDiary: [...(report.investigationDiary || []), newEntry],
    };

    handleReportUpdate(updatedReport);
    diaryForm.reset();
    setIsDiaryDialogOpen(false); // Close dialog on submit
    toast({
      title: 'Diary Entry Added',
      description: 'Your entry has been added to the investigation diary.',
    });
  };

  useEffect(() => {
    setIsIcaoLoading(false);
    if (icaoState.data?.category && report) {
      handleReportUpdate({ ...report, occurrenceCategory: icaoState.data.category }, true);
      toast({
        title: 'AI Suggestion Complete',
        description: `Suggested category: ${icaoState.data.category}. ${icaoState.data.reasoning}`,
      });
    } else if (icaoState.message && !icaoState.message.includes('complete')) {
       toast({ variant: 'destructive', title: 'Error', description: icaoState.message });
    }
  }, [icaoState]);


  const handleReportUpdate = async (updatedReport: SafetyReport, showToast = true) => {
    if (!company) return;
    setReport(updatedReport); // Optimistic update
    try {
        const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
        await setDoc(reportRef, updatedReport, { merge: true });
        if (showToast) {
            toast({ title: 'Report Updated', description: 'Your changes have been saved.' });
        }
    } catch (error) {
        console.error("Error updating report:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to the database.' });
        // Optionally revert state here
    }
  };

  const handlePromoteRisk = async (newRisk: Risk) => {
    if (!company) return;
    try {
        const riskRef = doc(db, `companies/${company.id}/risks`, newRisk.id);
        await setDoc(riskRef, newRisk);
    } catch (error) {
        console.error("Error promoting risk:", error);
        toast({ variant: 'destructive', title: 'Promotion Failed', description: 'Could not save risk to the central register.' });
    }
  };

  if (loading || dataLoading) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading report...</p>
        </main>
    );
  }

  if (!report) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested safety report could not be found.</p>
        </main>
    );
  }
  
  const generateMailtoLink = () => {
    if (!report) return "";

    const subject = `Safety Report: ${report.reportNumber} - ${report.heading}`;
    let body = `A safety report requires your attention.\n\n`;
    body += `Report Number: ${report.reportNumber}\n`;
    body += `Heading: ${report.heading}\n`;
    body += `Status: ${report.status}\n`;
    body += `Date of Occurrence: ${report.occurrenceDate}\n\n`;
    body += `Details:\n${report.details}\n\n`;
    body += `Link to report: ${window.location.href}`;

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const headerContent = (
    <>
        <Button asChild variant="outline" className="no-print">
            <Link href="/safety?tab=reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Reports
            </Link>
        </Button>
        <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.print()} className="no-print">
                <Printer className="mr-2 h-4 w-4" />
                Print Report
            </Button>
            <a href={generateMailtoLink()}>
                 <Button variant="outline" className="no-print">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Report
                </Button>
            </a>
        </div>
    </>
  );
  
  const showScfFields = report.occurrenceCategory === 'SCF-NP' || report.occurrenceCategory === 'SCF-PP';
  const showLosFields = report.occurrenceCategory === 'MAC';
  const showWeatherFields = report.occurrenceCategory && WEATHER_RELATED_CATEGORIES.includes(report.occurrenceCategory);
  const showBirdStrikeFields = report.occurrenceCategory === 'BIRD';

  return (
    <>
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                        <CardTitle className="mt-2">{report.reportNumber}: {report.heading}</CardTitle>
                        <CardDescription>
                            Occurrence on {report.occurrenceDate} at {report.occurrenceTime || 'N/A'}. Filed by {report.submittedBy} on {report.filedDate}.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>
                
            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-6 h-auto">
                    <TabsTrigger value="details">Report Details</TabsTrigger>
                    <TabsTrigger value="classification">Classification</TabsTrigger>
                    <TabsTrigger value="investigation">Investigation</TabsTrigger>
                    <TabsTrigger value="risk-mitigation">Risk Mitigation</TabsTrigger>
                    <TabsTrigger value="corrective-action">Corrective Action</TabsTrigger>
                    <TabsTrigger value="final-review">Final Review</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-6 space-y-4">
                    <h3 className="font-semibold text-lg">Details of Occurrence</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                        {report.details}
                    </p>
                </TabsContent>
                <TabsContent value="classification" className="mt-6 space-y-8">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-2 flex-1 min-w-[200px]">
                            <label className="text-sm font-medium">Report Status</label>
                            <Select 
                                value={report.status} 
                                onValueChange={(value: SafetyReport['status']) => handleReportUpdate({ ...report, status: value }, true)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Under Review">Under Review</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 flex-1 min-w-[240px]">
                            <label className="text-sm font-medium flex items-center gap-1">
                                ICAO Occurrence Category
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5">
                                            <Info className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>ICAO Occurrence Categories</DialogTitle>
                                            <DialogDescription>
                                                Standardized categories for aviation occurrences based on the ICAO ADREP taxonomy.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <ScrollArea className="h-96">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Definition</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {ICAO_OPTIONS.map(option => (
                                                        <TableRow key={option.value}>
                                                            <TableCell className="font-mono">{option.label}</TableCell>
                                                            <TableCell>{option.description}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </DialogContent>
                                </Dialog>
                            </label>
                            <div className="flex gap-2">
                                <Combobox
                                    options={ICAO_OPTIONS}
                                    value={report.occurrenceCategory || ''}
                                    onChange={(value) => handleReportUpdate({ ...report, occurrenceCategory: value }, false)}
                                    placeholder="Select ICAO category..."
                                    searchPlaceholder="Search categories..."
                                    noResultsText="No category found."
                                />
                                <form action={icaoFormAction}>
                                    <input type="hidden" name="reportText" value={report.details} />
                                    <Button type="submit" variant="outline" size="icon" disabled={isIcaoLoading} onClick={() => setIsIcaoLoading(true)}>
                                        {isIcaoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </div>
                        </div>
                            <div className="space-y-2 flex-1 min-w-[200px]">
                            <label className="text-sm font-medium">Classification</label>
                            <Select 
                                value={report.classification || ''}
                                onValueChange={(value: SafetyReport['classification']) => handleReportUpdate({ ...report, classification: value }, true)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Classify event" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASSIFICATION_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {showScfFields && (
                        <div className="space-y-2 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium">System/Component Failure Details</label>
                            <Select 
                                value={report.subCategory || ''}
                                onValueChange={(value) => handleReportUpdate({ ...report, subCategory: value }, false)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select the affected system" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCF_SUBCATEGORIES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Textarea
                                placeholder="Add any other relevant details about the system/component failure..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                            />
                        </div>
                    )}

                    {showLosFields && (
                        <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium block mb-2">Loss of Separation Details</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">Event Type</label>
                                    <Select value={report.subCategory || ''} onValueChange={(value) => handleReportUpdate({ ...report, subCategory: value }, false)}>
                                        <SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger>
                                        <SelectContent>
                                            {LOS_SUBCATEGORIES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {report.subCategory === 'Resolution Advisory (RA)' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">RA Callout</label>
                                                <Select value={report.raCallout || ''} onValueChange={(value) => handleReportUpdate({ ...report, raCallout: value }, false)}>
                                                <SelectTrigger><SelectValue placeholder="Select RA callout" /></SelectTrigger>
                                                <SelectContent>
                                                    {RA_CALLOUTS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">RA Followed?</label>
                                                <Select value={report.raFollowed || ''} onValueChange={(value: 'Yes' | 'No') => handleReportUpdate({ ...report, raFollowed: value }, false)}>
                                                <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Yes">Yes</SelectItem>
                                                    <SelectItem value="No">No</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </div>
                            <Textarea
                                placeholder="Add any other relevant details about the loss of separation..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                            />
                        </div>
                    )}
                    
                    {showWeatherFields && (
                        <WeatherInputGroup report={report} onUpdate={handleReportUpdate} />
                    )}

                    {showBirdStrikeFields && (
                            <div className="space-y-4 p-4 border bg-muted/50 rounded-lg">
                            <label className="text-sm font-medium block flex items-center gap-2">
                                <Bird className="h-4 w-4" />
                                Bird Strike Details
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                <div className="space-y-2">
                                    <Label htmlFor="bird-number">Number of Birds</Label>
                                    <Select value={report.numberOfBirds || ''} onValueChange={(value) => handleReportUpdate({ ...report, numberOfBirds: value }, false)}>
                                        <SelectTrigger id="bird-number"><SelectValue placeholder="Select number" /></SelectTrigger>
                                        <SelectContent>{BIRD_NUMBERS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bird-size">Size of Birds</Label>
                                    <Select value={report.sizeOfBirds || ''} onValueChange={(value) => handleReportUpdate({ ...report, sizeOfBirds: value }, false)}>
                                        <SelectTrigger id="bird-size"><SelectValue placeholder="Select size" /></SelectTrigger>
                                        <SelectContent>{BIRD_SIZES.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bird-part">Part Struck</Label>
                                    <Select value={report.partOfAircraftStruck || ''} onValueChange={(value) => handleReportUpdate({ ...report, partOfAircraftStruck: value }, false)}>
                                        <SelectTrigger id="bird-part"><SelectValue placeholder="Select part" /></SelectTrigger>
                                        <SelectContent>{BIRD_STRIKE_PARTS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                    <Switch 
                                        id="bird-damage"
                                        checked={report.birdStrikeDamage}
                                        onCheckedChange={(checked) => handleReportUpdate({ ...report, birdStrikeDamage: checked }, false)}
                                    />
                                    <Label htmlFor="bird-damage">Damage Reported?</Label>
                                </div>
                            </div>
                                <Textarea
                                placeholder="Add any other relevant details about the bird strike..."
                                value={report.eventSubcategoryDetails || ''}
                                onChange={e => handleReportUpdate({ ...report, eventSubcategoryDetails: e.target.value }, false)}
                                />
                            </div>
                    )}

                    <InitialRiskAssessment report={report} onUpdate={handleReportUpdate} onPromoteRisk={handlePromoteRisk}/>
                </TabsContent>
                
                <TabsContent value="investigation" className="mt-6 space-y-6">
                   <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Investigation Team</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InvestigationTeamForm report={report} onUpdate={handleReportUpdate} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>AI Toolkit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="steps">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="steps">Suggested Steps</TabsTrigger>
                                        <TabsTrigger value="whys">5 Whys Analysis</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="steps" className="pt-4">
                                        <InvestigationStepsGenerator report={report} />
                                    </TabsContent>
                                    <TabsContent value="whys" className="pt-4">
                                        <FiveWhysGenerator report={report} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Investigation Discussion</CardTitle>
                           <Dialog open={isDiscussionDialogOpen} onOpenChange={setIsDiscussionDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <Send className="mr-2 h-4 w-4" />
                                        Post Message
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Post New Message</DialogTitle>
                                        <DialogDescription>Your message will be visible to all members of the investigation team.</DialogDescription>
                                    </DialogHeader>
                                    <Form {...discussionForm}>
                                        <form onSubmit={discussionForm.handleSubmit(handleNewDiscussionMessage)} className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                                            <FormField
                                                control={discussionForm.control}
                                                name="recipient"
                                                render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel>Send To</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                        <SelectValue placeholder="Select a team member" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableRecipients.map((p) => (
                                                        <SelectItem key={p.id} value={p.name}>
                                                            {p.name}
                                                        </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={discussionForm.control}
                                                name="replyByDate"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Reply Needed By (Optional)</FormLabel>
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
                                                                disabled={(date) => date < new Date()}
                                                                initialFocus
                                                            />
                                                            </PopoverContent>
                                                        </Popover>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={discussionForm.control}
                                            name="message"
                                            render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Message / Instruction</FormLabel>
                                                <FormControl>
                                                <Textarea
                                                    id="message"
                                                    placeholder="Type your message here..."
                                                    className="min-h-[100px]"
                                                    {...field}
                                                />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                        <div className="flex justify-end items-center">
                                            <Button type="submit">
                                                <Send className="mr-2 h-4 w-4" />
                                                Post Message
                                            </Button>
                                        </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                           <DiscussionSection 
                             report={report} 
                             onUpdate={handleReportUpdate} 
                           />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Investigation Diary</CardTitle>
                            <Dialog open={isDiaryDialogOpen} onOpenChange={setIsDiaryDialogOpen}>
                                <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Entry
                                </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                    <DialogTitle>Add New Diary Entry</DialogTitle>
                                    <DialogDescription>
                                        Record an action, decision, or note. This will be added to the chronological investigation log.
                                    </DialogDescription>
                                    </DialogHeader>
                                    <Form {...diaryForm}>
                                    <form onSubmit={diaryForm.handleSubmit(handleNewDiaryEntry)} className="space-y-4">
                                        <FormField
                                        control={diaryForm.control}
                                        name="entryText"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>New Diary Entry</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                id="diaryEntry"
                                                placeholder="Log an action, decision, or note..."
                                                className="min-h-[100px]"
                                                {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <div className="flex justify-end items-center">
                                        <Button type="submit">
                                            Add to Diary
                                        </Button>
                                        </div>
                                    </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                             <InvestigationDiary report={report}/>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle>Investigation Notes & Findings</CardTitle>
                             <CardDescription>Record all investigation notes, findings, and discussions here. This will be used to generate the corrective action plan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea 
                                id="investigation-notes"
                                placeholder="Record all investigation notes, findings, and discussions here..."
                                className="min-h-[300px]"
                                value={report.investigationNotes || ''}
                                onChange={(e) => handleReportUpdate({ ...report, investigationNotes: e.target.value }, false)}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="risk-mitigation" className="mt-6 space-y-6">
                    <MitigatedRiskAssessment report={report} onUpdate={handleReportUpdate} correctiveActions={report.correctiveActionPlan?.correctiveActions}/>
                </TabsContent>
                <TabsContent value="corrective-action" className="mt-6">
                    <CorrectiveActionPlanGenerator 
                        report={report} 
                        personnel={personnel}
                        onUpdate={handleReportUpdate} 
                    />
                </TabsContent>
                <TabsContent value="final-review" className="mt-6">
                    <FinalReview report={report} onUpdate={handleReportUpdate} />
                </TabsContent>
            </Tabs>
      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;
