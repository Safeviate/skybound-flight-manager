

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
import type { Risk, SafetyReport, User, InvestigationTask } from '@/lib/types';
import { ArrowLeft, Mail, Printer, Info, Wind, Bird, Bot, Loader2, BookOpen, Send, PlusCircle, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, arrayUnion } from 'firebase/firestore';
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
import { CalendarIcon, Check, CheckCircle } from 'lucide-react';
import type { DiscussionEntry, InvestigationDiaryEntry } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';


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

const discussionFormSchema = z.object({
  recipient: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;

const diaryFormSchema = z.object({
  entryText: z.string().min(1, 'Diary entry cannot be empty.'),
});

type DiaryFormValues = z.infer<typeof diaryFormSchema>;

const InvestigationTaskList = ({ tasks, onUpdateTask }: { tasks: InvestigationTask[], onUpdateTask: (taskId: string, status: 'Open' | 'Completed') => void }) => {
    if (!tasks || tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No investigation tasks assigned.</p>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListTodo /> Investigation Task List</CardTitle>
                <CardDescription>All tasks assigned for this investigation.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Task Description</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Due Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map(task => (
                            <TableRow key={task.id} className={cn(task.status === 'Completed' && 'text-muted-foreground line-through')}>
                                <TableCell>
                                    <Checkbox 
                                        checked={task.status === 'Completed'}
                                        onCheckedChange={(checked) => onUpdateTask(task.id, checked ? 'Completed' : 'Open')}
                                    />
                                </TableCell>
                                <TableCell>{task.description}</TableCell>
                                <TableCell>{task.assignedTo}</TableCell>
                                <TableCell>
                                    <Badge variant={new Date(task.dueDate) < new Date() && task.status === 'Open' ? 'destructive' : 'outline'}>
                                        {format(new Date(task.dueDate), 'PPP')}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

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
    if (!personnel || personnel.length === 0 || !report || !report.investigationTeam) {
      return [];
    }
    return personnel.filter(
      (u) => report.investigationTeam?.includes(u.name) && u.name !== user?.name
    );
  }, [personnel, report, user]);

  const handleNewDiscussionMessage = (data: DiscussionFormValues) => {
    if (!user || !report || !company) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: DiscussionEntry = {
        id: `d-${Date.now()}`,
        author: user.name,
        recipient: data.recipient || 'Team',
        message: data.message,
        datePosted: new Date().toISOString(),
        replyByDate: data.replyByDate ? data.replyByDate.toISOString() : undefined,
    };
    
    const updatedReport = {
        ...report,
        discussion: [...(report.discussion || []), newEntry],
    };

    handleReportUpdate(updatedReport, true);
    discussionForm.reset();
    setIsDiscussionDialogOpen(false);

    if (data.recipient) {
      toast({
        title: 'Message Sent',
        description: `Your message has been sent to ${data.recipient}.`,
      });
    } else {
      toast({
        title: 'Message Posted',
        description: `Your message has been posted to the team.`
      });
    }
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
  }, [icaoState, report, toast]);


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
  
  const handleAssignTasks = (tasksToAssign: Omit<InvestigationTask, 'id' | 'status'>[]) => {
    if (!report) return;

    const newTasks: InvestigationTask[] = tasksToAssign.map((task, index) => ({
      ...task,
      id: `task-${Date.now()}-${index}`,
      status: 'Open',
    }));
    
    const updatedReport: SafetyReport = {
        ...report,
        tasks: [...(report.tasks || []), ...newTasks]
    };

    handleReportUpdate(updatedReport, true);
    toast({
        title: "Tasks Assigned",
        description: `${newTasks.length} investigation task(s) have been added.`
    });
  };

  const handleUpdateTaskStatus = (taskId: string, status: 'Open' | 'Completed') => {
    if (!report) return;
    
    const updatedTasks = report.tasks?.map(task => 
        task.id === taskId ? { ...task, status } : task
    );
    
    handleReportUpdate({ ...report, tasks: updatedTasks });
  }

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
                     <div className="flex items-center gap-2">
                         <Button asChild variant="outline">
                            <Link href="/safety?tab=reports">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Reports
                            </Link>
                        </Button>
                        <Button variant="outline" onClick={() => window.print()} className="no-print">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
                
            <Tabs defaultValue="triage" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="triage">Report &amp; Triage</TabsTrigger>
                    <TabsTrigger value="investigation">Investigation</TabsTrigger>
                    <TabsTrigger value="mitigation">Mitigation &amp; CAP</TabsTrigger>
                    <TabsTrigger value="review">Final Review &amp; Sign-off</TabsTrigger>
                </TabsList>

                <TabsContent value="triage" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Initial Report Details</CardTitle>
                            <CardDescription>This is the original report as submitted.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
                                {report.details}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle>Classification &amp; Categorization</CardTitle>
                             <CardDescription>Classify the report and assign an ICAO occurrence category.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                                                    <TableCell>{option.label}</TableCell>
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
                        </CardContent>
                    </Card>

                    <InitialRiskAssessment report={report} onUpdate={handleReportUpdate} onPromoteRisk={handlePromoteRisk}/>
                </TabsContent>
                
                <TabsContent value="investigation" className="mt-6 space-y-6">
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
                                    <InvestigationStepsGenerator 
                                        report={report} 
                                        personnel={personnel}
                                        onAssignTasks={handleAssignTasks}
                                    />
                                </TabsContent>
                                <TabsContent value="whys" className="pt-4">
                                    <FiveWhysGenerator report={report} onUpdate={handleReportUpdate} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                    <InvestigationTaskList tasks={report.tasks || []} onUpdateTask={handleUpdateTaskStatus} />
                    <Card>
                        <CardHeader>
                            <CardTitle>Investigation Team</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <InvestigationTeamForm report={report} onUpdate={handleReportUpdate} />
                        </CardContent>
                    </Card>
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
                                                    <FormLabel>Send To (Optional)</FormLabel>
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
                <TabsContent value="mitigation" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Risk Mitigation Assessment</CardTitle>
                             <CardDescription>Assess the effectiveness of corrective actions by measuring the residual risk.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MitigatedRiskAssessment report={report} onUpdate={handleReportUpdate} correctiveActions={report.correctiveActionPlan?.correctiveActions}/>
                        </CardContent>
                     </Card>
                     <CorrectiveActionPlanGenerator 
                        report={report} 
                        personnel={personnel}
                        onUpdate={handleReportUpdate} 
                    />
                </TabsContent>
                <TabsContent value="review" className="mt-6">
                    <FinalReview report={report} onUpdate={handleReportUpdate} />
                </TabsContent>
            </Tabs>
      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;
