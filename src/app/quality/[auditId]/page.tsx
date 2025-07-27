

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, AuditChecklistItem, User, DiscussionEntry, CorrectiveActionPlan, Alert } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, FileText, Save, Send, PlusCircle, Database, Check, Percent, Bot, Printer } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { doc, getDoc, updateDoc, setDoc, arrayUnion, collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { DiscussionSection } from './discussion-section';
import { CorrectiveActionPlanForm } from './corrective-action-plan-form';
import { QualityAuditAnalyzer } from '../quality-audit-analyzer';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { AuditTeamForm } from './audit-team-form';


const discussionFormSchema = z.object({
  recipient: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;

const getFindingInfo = (finding: FindingStatus | null) => {
    switch (finding) {
        case 'Compliant': return { icon: <CheckCircle className="h-5 w-5 text-green-600" />, variant: 'success' as const, text: 'Compliant' };
        case 'Partial': return { icon: <MinusCircle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const, text: 'Partial Compliance' };
        case 'Non-compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        case 'Not Applicable': return { icon: <Ban className="h-5 w-5 text-gray-500" />, variant: 'outline' as const, text: 'N/A' };
        default: return { icon: <ListChecks className="h-5 w-5" />, variant: 'outline' as const, text: finding || 'Not Set' };
    }
};

const getLevelInfo = (level: FindingLevel) => {
    switch (level) {
        case 'Level 1 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const };
        case 'Level 2 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-orange-600" />, variant: 'orange' as const };
        case 'Level 3 Finding': return { icon: <AlertTriangle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const };
        default: return null;
    }
};

const findingOptions: FindingStatus[] = ['Compliant', 'Non-compliant', 'Partial', 'Observation', 'Not Applicable'];
const levelOptions: FindingLevel[] = ['Level 1 Finding', 'Level 2 Finding', 'Level 3 Finding', 'Observation'];

const AuditReportView = ({ audit, onUpdate, personnel }: { audit: QualityAudit, onUpdate: (updatedAudit: QualityAudit, showToast?: boolean) => void, personnel: User[] }) => {
    const [editingIssue, setEditingIssue] = React.useState<NonConformanceIssue | null>(null);
    const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = React.useState(false);
    const [suggestedCap, setSuggestedCap] = React.useState<GenerateQualityCapOutput | null>(null);
    const { user, company } = useUser();
    const { toast } = useToast();
    const discussionForm = useForm<DiscussionFormValues>({
        resolver: zodResolver(discussionFormSchema),
    });

    const availableRecipients = React.useMemo(() => {
        if (!audit.investigationTeam || !user) return [];
        // Allow sending to any team member except the current user
        return audit.investigationTeam.filter(name => name !== user.name);
    }, [audit.investigationTeam, user]);


    const handleReply = (recipient: string) => {
        discussionForm.setValue('recipient', recipient);
        setIsDiscussionDialogOpen(true);
    };

    const handleCapSubmit = async (data: CorrectiveActionPlan) => {
        if (!editingIssue || !company || !user) return;

        // Create an alert for the responsible person
        const responsibleUser = personnel.find(p => p.name === data.responsiblePerson);
        if (responsibleUser) {
             const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${audit.id.substring(0,8)}`,
                description: `Action required for finding: "${editingIssue.itemText}"`,
                author: user.name, // The person assigning the task
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: responsibleUser.id,
                relatedLink: `/quality/${audit.id}`,
            };
            const alertsCollection = collection(db, `companies/${company.id}/alerts`);
            await addDoc(alertsCollection, newAlert);
            toast({ title: 'Task Assigned', description: `An alert has been sent to ${responsibleUser.name}.`});
        }
        
        const updatedIssues = audit.nonConformanceIssues.map(issue => 
            issue.id === editingIssue.id ? { ...issue, correctiveActionPlan: data } : issue
        );

        onUpdate({ ...audit, nonConformanceIssues: updatedIssues }, true);
        setEditingIssue(null);
    }

    const handleNewDiscussionMessage = async (data: DiscussionFormValues) => {
        if (!user || !audit || !company) {
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

        const cleanNewEntry = JSON.parse(JSON.stringify(newEntry));
        
        const updatedAudit = {
            ...audit,
            discussion: [...(audit.discussion || []), cleanNewEntry],
        };

        const recipients = data.recipient
          ? [data.recipient]
          : audit.investigationTeam?.filter((name) => name !== user.name) || [];

        if (recipients.length > 0) {
            toast({ title: 'Message Posted', description: `A notification has been sent to relevant team members.`});
        }
        
        for (const recipientName of recipients) {
            const recipientUser = personnel.find(p => p.name === recipientName);
            if (recipientUser) {
                const newAlert: Omit<Alert, 'id' | 'number'> = {
                    companyId: company.id,
                    type: 'Task',
                    title: `New Message on Audit: ${audit.id.substring(0,8)}`,
                    description: `From ${user.name}: "${data.message.substring(0, 50)}..."`,
                    author: user.name,
                    date: new Date().toISOString(),
                    readBy: [],
                    targetUserId: recipientUser.id,
                    relatedLink: `/quality/${audit.id}`,
                };
                const alertsCollection = collection(db, `companies/${company.id}/alerts`);
                await addDoc(alertsCollection, newAlert);
            }
        }


        onUpdate(updatedAudit, true);
        discussionForm.reset();
        setIsDiscussionDialogOpen(false);
    }
    
    return (
        <div className="space-y-6 print:space-y-4">
            <Dialog open={!!editingIssue} onOpenChange={(isOpen) => { if (!isOpen) { setEditingIssue(null); setSuggestedCap(null); }}}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Corrective Action Plan</DialogTitle>
                        <DialogDescription>
                            Create a corrective action plan for the finding: "{editingIssue?.itemText}"
                        </DialogDescription>
                    </DialogHeader>
                    <CorrectiveActionPlanForm 
                        onSubmit={handleCapSubmit} 
                        suggestedCap={suggestedCap}
                    />
                </DialogContent>
            </Dialog>

             <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl">Audit Report: {audit.id}</CardTitle>
                        <CardDescription>
                        This is the final report for the {audit.type} audit on {audit.area}, conducted on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Compliance Score</p>
                            <p className="text-3xl font-bold text-primary">{audit.complianceScore}%</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Non-Conformances</p>
                            <p className="text-3xl font-bold text-destructive">{audit.nonConformanceIssues.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Status</p>
                            <Badge variant="success" className="text-lg mt-1">Closed</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3 no-print">
                    <TabsTrigger value="summary">Summary &amp; Findings</TabsTrigger>
                    <TabsTrigger value="checklist">Full Checklist</TabsTrigger>
                    <TabsTrigger value="discussion">Discussion</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-6 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Audit Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground p-2 border rounded-md min-h-[60px]">{audit.summary || 'No summary was provided.'}</p>
                        </CardContent>
                    </Card>

                    {audit.nonConformanceIssues.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Non-Conformance Report</CardTitle>
                                <CardDescription>Details of all non-compliant findings from this audit.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {audit.nonConformanceIssues.map(issue => {
                                    const issueText = `Non-Conformance: ${issue.itemText}\nLevel: ${issue.level}\nRegulation: ${issue.regulationReference}\n\nAuditor Comment:\n${issue.comment}`;
                                    return (
                                        <div key={issue.id} className="p-4 border rounded-lg mb-4 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <Badge variant={getLevelInfo(issue.level)?.variant || 'secondary'}>{issue.level}</Badge>
                                                    <p className="font-medium mt-2">{issue.itemText}</p>
                                                    <p className="text-xs text-muted-foreground">{issue.regulationReference || 'N/A'}</p>
                                                    <p className="text-sm mt-1 p-2 bg-muted rounded-md">{issue.comment}</p>
                                                </div>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="no-print">
                                                            <Bot className="mr-2 h-4 w-4" />
                                                            AI Analysis
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-2xl">
                                                         <QualityAuditAnalyzer 
                                                            auditText={issueText}
                                                            onCapSuggested={(cap) => {
                                                                setSuggestedCap(cap);
                                                                setEditingIssue(issue);
                                                            }}
                                                         />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            {issue.correctiveActionPlan ? (
                                                <div className="space-y-4">
                                                    <h4 className="font-semibold text-sm">Corrective Action Plan</h4>
                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="font-medium text-muted-foreground">Root Cause</p>
                                                            <p className="text-justify">{issue.correctiveActionPlan.rootCause}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-muted-foreground">Corrective Action</p>
                                                            <p className="text-justify">{issue.correctiveActionPlan.correctiveAction}</p>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-muted-foreground">Preventative Action</p>
                                                            <p className="text-justify">{issue.correctiveActionPlan.preventativeAction}</p>
                                                        </div>
                                                    </div>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Responsible Person</TableHead>
                                                                <TableHead>Due Date</TableHead>
                                                                <TableHead>Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell>{issue.correctiveActionPlan.responsiblePerson}</TableCell>
                                                                <TableCell>{issue.correctiveActionPlan.completionDate}</TableCell>
                                                                <TableCell><Badge variant="outline">{issue.correctiveActionPlan.status}</Badge></TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <Button onClick={() => setEditingIssue(issue)} className="no-print">Create Corrective Action Plan</Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>
                    )}
                     <Card>
                        <CardHeader>
                            <CardTitle>Additional Checklist Findings</CardTitle>
                            <CardDescription>
                                A log of all compliant items and observations from the audit.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {audit.checklistItems.filter(item => item.finding !== 'Non-compliant' && item.finding !== 'Partial').map(item => {
                                const { icon, variant, text } = getFindingInfo(item.finding);
                                return (
                                    <div key={item.id} className="p-4 border rounded-lg mb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{item.text}</p>
                                                <p className="text-xs text-muted-foreground">{item.regulationReference || 'N/A'}</p>
                                            </div>
                                            <Badge variant={variant} className="whitespace-nowrap">
                                                {icon}
                                                <span className="ml-2">{text}</span>
                                            </Badge>
                                        </div>
                                        {item.comment && <p className="text-sm mt-2 p-2 bg-muted rounded-md">{item.comment}</p>}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="checklist" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Full Audit Checklist</CardTitle>
                            <CardDescription>
                                A complete log of all items from the audit questionnaire.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {audit.checklistItems.map(item => {
                                const { icon, variant, text } = getFindingInfo(item.finding);
                                return (
                                    <div key={item.id} className="p-4 border rounded-lg mb-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium">{item.text}</p>
                                                <p className="text-xs text-muted-foreground">{item.regulationReference || 'N/A'}</p>
                                            </div>
                                            <Badge variant={variant} className="whitespace-nowrap">
                                                {icon}
                                                <span className="ml-2">{text}</span>
                                            </Badge>
                                        </div>
                                        {item.comment && <p className="text-sm mt-2 p-2 bg-muted rounded-md">{item.comment}</p>}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="discussion" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Discussion Forum</CardTitle>
                                <CardDescription>
                                    A forum for auditors and auditees to discuss findings and corrective actions.
                                </CardDescription>
                            </div>
                            <Dialog open={isDiscussionDialogOpen} onOpenChange={setIsDiscussionDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="no-print">
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
                                                        {availableRecipients.map((name) => (
                                                        <SelectItem key={name} value={name}>
                                                            {name}
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
                                audit={audit} 
                                onReply={handleReply}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default function QualityAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const auditId = params.auditId as string;
  const [personnel, setPersonnel] = useState<User[]>([]);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!company) {
      setLoading(false);
      return;
    }
    
    const fetchAudit = async () => {
      setLoading(true);
      try {
        const auditRef = doc(db, `companies/${company!.id}/quality-audits`, auditId);
        const auditSnap = await getDoc(auditRef);

        if (auditSnap.exists()) {
          setAudit({ ...auditSnap.data(), id: auditSnap.id } as QualityAudit);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Audit not found.' });
        }
      } catch (error) {
        console.error("Error fetching audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch audit details.' });
      } finally {
        setLoading(false);
      }
    };
    
    const fetchPersonnel = async () => {
        const personnelQuery = collection(db, `companies/${company!.id}/users`);
        const snapshot = await getDocs(personnelQuery);
        setPersonnel(snapshot.docs.map(doc => doc.data() as User));
    };

    fetchAudit();
    fetchPersonnel();
  }, [auditId, user, company, userLoading, router, toast]);
  
  const handleItemChange = (itemId: string, field: keyof AuditChecklistItem, value: any) => {
    if (!audit) return;
    const updatedItems = audit.checklistItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
    );
    handleAuditUpdate({ ...audit, checklistItems: updatedItems }, false);
  }

  const handleAuditUpdate = async (updatedAudit: QualityAudit, showToast = true) => {
    if (!company) return;

    // Create a deep copy and remove undefined values recursively
    const cleanAudit = JSON.parse(JSON.stringify(updatedAudit, (key, value) => {
        return value === undefined ? null : value;
    }));
    
    // Replace nulls back to undefined where Firestore allows, or keep as null
    // For this case, we can just send the 'cleanAudit' object which has nulls instead of undefined.
    // Firestore handles 'null' correctly. The issue was with 'undefined'.

    setAudit(cleanAudit); // Optimistic update with cleaned data
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        await setDoc(auditRef, cleanAudit, { merge: true });
        if (showToast) {
            toast({ title: 'Audit Updated', description: 'Your changes have been saved.' });
        }
    } catch (error) {
        console.error("Error updating audit:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to the database.' });
    }
  };
  
   const handleFinalizeAudit = () => {
    if (!audit) return;

    const totalApplicableItems = audit.checklistItems.filter(item => item.finding !== 'Not Applicable').length;
    const compliantItems = audit.checklistItems.filter(item => item.finding === 'Compliant').length;
    const complianceScore = totalApplicableItems > 0 ? Math.round((compliantItems / totalApplicableItems) * 100) : 100;

    const nonConformanceIssues = audit.checklistItems
        .filter(item => item.finding === 'Non-compliant' || item.finding === 'Partial')
        .map(item => ({
            id: item.id,
            itemText: item.text,
            regulationReference: item.regulationReference,
            finding: item.finding!,
            level: item.level!,
            comment: item.comment,
            reference: item.reference,
            correctiveActionPlan: null,
        }));

    const finalAudit: QualityAudit = {
      ...audit,
      status: 'Closed',
      complianceScore,
      nonConformanceIssues,
    };

    handleAuditUpdate(finalAudit, true);
    toast({
        title: 'Audit Finalized',
        description: `The audit has been closed with a compliance score of ${complianceScore}%.`,
    });
  };
  
  const handleSeedData = () => {
    if (!audit) return;

    const findingOptions: FindingStatus[] = ['Compliant', 'Non-compliant', 'Partial', 'Observation', 'Not Applicable'];
    const levelOptions: FindingLevel[] = ['Level 1 Finding', 'Level 2 Finding', 'Level 3 Finding', 'Observation'];

    const seededItems = audit.checklistItems.map((item, index) => {
        let finding: FindingStatus = 'Compliant';
        let level: FindingLevel = null;
        let comment = 'Verified and found to be in full compliance with all relevant regulations.';
        let reference = 'Checked against Operations Manual Rev 5.1, Section 3.2.';

        // Make every 5th item non-compliant, and every 7th an observation
        if ((index + 1) % 5 === 0) {
            finding = 'Non-compliant';
            level = levelOptions[Math.floor(Math.random() * 3)];
            comment = 'A significant deviation from standard operating procedure was noted during the audit.';
            reference = 'Observed deviation during hangar inspection on Aug 15, 2024.';
        } else if ((index + 1) % 7 === 0) {
            finding = 'Observation';
            level = 'Observation';
            comment = 'While technically compliant, the process could be improved for better efficiency and clarity.';
            reference = 'Auditor discussion with ground crew chief.';
        }

        return { ...item, finding, level, comment, reference };
    });

    handleAuditUpdate({ ...audit, checklistItems: seededItems }, true);
    toast({
      title: 'Audit Seeded',
      description: 'The audit checklist has been pre-filled with sample data.',
    });
  };

  if (loading || userLoading) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading audit details...</p>
        </main>
    );
  }

  if (!audit) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested quality audit could not be found.</p>
        </main>
    );
  }

  const isAuditClosed = audit.status === 'Closed' || audit.status === 'Archived';
  
  return (
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        {isAuditClosed ? (
            <AuditReportView audit={audit} onUpdate={handleAuditUpdate} personnel={personnel} />
        ) : (
        <>
            <h2 className="text-2xl font-bold">Audit Questionnaire</h2>
            <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                <div>
                    <CardTitle className="text-2xl">Quality Audit: {audit.id}</CardTitle>
                    <CardDescription>
                    Conducting {audit.type} audit on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                    </CardDescription>
                </div>
                <Badge variant="outline">{audit.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-6">
                <div>
                    <p className="font-semibold text-muted-foreground">Area Audited</p>
                    <p>{audit.area}</p>
                </div>
                <div>
                    <p className="font-semibold text-muted-foreground">Audit Type</p>
                    <p>{audit.type}</p>
                </div>
                <div>
                    <p className="font-semibold text-muted-foreground">Lead Auditor</p>
                    <p>{audit.auditor}</p>
                </div>
                 <div>
                    <p className="font-semibold text-muted-foreground">Auditee</p>
                    <p>{audit.auditeeName || 'N/A'}</p>
                </div>
                </div>
                <div className="space-y-2 border-t pt-6">
                    <h3 className="font-semibold">Audit Summary</h3>
                    <Textarea 
                    placeholder="Enter the overall audit summary here..."
                    className="min-h-[100px]"
                    value={audit.summary}
                    onChange={(e) => handleAuditUpdate({ ...audit, summary: e.target.value }, false)}
                    />
                </div>
                 <div className="space-y-2 border-t pt-6">
                    <h3 className="font-semibold">Investigation Team</h3>
                    <AuditTeamForm audit={audit} personnel={personnel} onUpdate={handleAuditUpdate} />
                </div>
            </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Audit Checklist</CardTitle>
                    <div className="flex gap-2">
                    <Button onClick={handleSeedData} variant="outline">
                        <Database className="mr-2 h-4 w-4" />
                        Seed Data
                    </Button>
                    <Button onClick={() => handleAuditUpdate(audit)}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Progress
                    </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {audit.checklistItems && audit.checklistItems.length > 0 ? (
                        <div className="space-y-4">
                            {audit.checklistItems.map(item => {
                                const findingInfo = getFindingInfo(item.finding);
                                const levelInfo = getLevelInfo(item.level);
                                return (
                                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                        <div>
                                            <p className="font-medium">{item.text}</p>
                                            {item.regulationReference && <p className="text-xs text-muted-foreground">Regulation: {item.regulationReference}</p>}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Finding</p>
                                                <Select value={item.finding || ''} onValueChange={(value: FindingStatus) => handleItemChange(item.id, 'finding', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Finding" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {findingOptions.map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium">Level</p>
                                                <Select value={item.level || ''} onValueChange={(value: FindingLevel) => handleItemChange(item.id, 'level', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Level" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {levelOptions.map(opt => (
                                                            <SelectItem key={opt} value={opt!}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Reference</p>
                                            <Textarea
                                                placeholder="Document references, evidence, etc."
                                                value={item.reference || ''}
                                                onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                                />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Comment</p>
                                            <Textarea
                                                placeholder="Auditor comments, observations..."
                                                value={item.comment || ''}
                                                onChange={(e) => handleItemChange(item.id, 'comment', e.target.value)}
                                                />
                                        </div>

                                        <div className="flex items-center gap-4 text-sm pt-2 border-t">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Result:</span>
                                                <Badge variant={findingInfo.variant} className="whitespace-nowrap">
                                                    {findingInfo.icon}
                                                    <span className="ml-2">{findingInfo.text}</span>
                                                </Badge>
                                                {levelInfo && (
                                                    <Badge variant={levelInfo.variant} className="whitespace-nowrap">
                                                    {item.level}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground font-semibold">No checklist items were recorded for this audit.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleFinalizeAudit} className="w-full" variant="destructive">
                        <Check className="mr-2 h-4 w-4" />
                        Save and Finalize Audit
                    </Button>
                </CardFooter>
            </Card>
        </>
        )}
      </main>
  );
}

QualityAuditDetailPage.title = "Quality Audit Investigation";

QualityAuditDetailPage.headerContent = function HeaderActions() {
    return (
        <Button variant="outline" className="no-print" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
        </Button>
    )
}



