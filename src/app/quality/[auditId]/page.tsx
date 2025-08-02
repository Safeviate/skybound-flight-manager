

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, AuditChecklistItem, User, DiscussionEntry, CorrectiveActionPlan, Alert } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, FileText, Save, Send, PlusCircle, Database, Check, Percent, Bot, Printer, Rocket, ArrowLeft, Signature, Eraser, Users } from 'lucide-react';
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
import { SignaturePad } from '@/components/ui/signature-pad';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

    const [isSigning, setIsSigning] = React.useState(false);

    const availableRecipients = React.useMemo(() => {
        if (!audit.investigationTeam || !user) return [];
        return audit.investigationTeam.filter(name => name !== user.name);
    }, [audit.investigationTeam, user]);


    const handleReply = (recipient: string) => {
        discussionForm.setValue('recipient', recipient);
        setIsDiscussionDialogOpen(true);
    };

    const handleCapSubmit = async (data: CorrectiveActionPlan) => {
        if (!editingIssue || !company || !user) return;

        const responsibleUser = personnel.find(p => p.name === data.responsiblePerson);
        if (responsibleUser) {
             const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${audit.id.substring(0,8)}`,
                description: `Action required for finding: "${editingIssue.itemText}"`,
                author: user.name, 
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

        const cleanNewEntry = JSON.parse(JSON.stringify(newEntry, (key, value) => {
            return value === undefined ? null : value;
        }));
        
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

    const handleRequestSignatures = async () => {
        if (!audit || !company || !user) return;
        const signatureUsers = [audit.auditor, audit.auditeeName].filter(Boolean) as string[];

        const alertsCollection = collection(db, `companies/${company.id}/alerts`);

        for (const sigUser of signatureUsers) {
            const targetUser = personnel.find(p => p.name === sigUser);
            if(targetUser) {
                 const newAlert: Omit<Alert, 'id' | 'number'> = {
                    companyId: company.id,
                    type: 'Signature Request',
                    title: `Signature Required: Audit ${audit.id.substring(0,8)}`,
                    description: `Your signature is required on the audit report: "${audit.title}"`,
                    author: user.name,
                    date: new Date().toISOString(),
                    readBy: [],
                    targetUserId: targetUser.id,
                    relatedLink: `/quality/${audit.id}`,
                };
                await addDoc(alertsCollection, newAlert);
            }
        }

        toast({
            title: 'Signatures Requested',
            description: `Alerts have been sent to ${signatureUsers.join(' and ')}.`
        });
    };

    const handleResetSignatures = () => {
        onUpdate({ ...audit, auditorSignature: undefined, auditeeSignature: undefined }, true);
        toast({
            title: 'Signatures Cleared',
            description: 'The signature fields for this audit have been reset.',
        });
    };

    const canSign = (user: User | null, personName: string | null | undefined): boolean => {
      if (!user || !personName || user.name !== personName) return false;
      const hasSignPermission = user.permissions.includes('Quality:Sign') || user.permissions.includes('Super User');
      return hasSignPermission;
    };
    
    return (
        <div id="printable-report-area" className="space-y-6 print:space-y-4">
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
                        <CardTitle className="text-2xl">{audit.title}</CardTitle>
                        <CardDescription>
                          Audit Number: {audit.id} <br />
                          Audit Date: {format(parseISO(audit.date), 'MMMM d, yyyy')}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" className="no-print">
                            <Link href="/quality?tab=audits">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Audits
                            </Link>
                        </Button>
                        <Button variant="outline" className="no-print" onClick={handleRequestSignatures}>
                            <Signature className="mr-2 h-4 w-4" />
                            Request Signatures
                        </Button>
                        <Button variant="destructive" size="sm" className="no-print" onClick={handleResetSignatures}>
                            <Eraser className="mr-2 h-4 w-4" />
                            Reset Signatures
                        </Button>
                         <Button variant="outline" className="no-print" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                        </Button>
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
                    {audit.evidenceReference && (
                        <div className="pt-2">
                            <h4 className="font-semibold text-sm">Evidence Reference / Scope</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-2 border rounded-md min-h-[60px]">{audit.evidenceReference}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4 no-print">
                    <TabsTrigger value="summary">Summary &amp; Findings</TabsTrigger>
                    <TabsTrigger value="team">Audit Team</TabsTrigger>
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
                 <TabsContent value="team" className="mt-4">
                    <AuditTeamForm audit={audit} onUpdate={onUpdate} personnel={personnel} />
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
             <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Signatures</CardTitle>
                    <CardDescription>
                        This audit must be signed by the Lead Auditor and the primary Auditee.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <h4 className="font-semibold">Lead Auditor: {audit.auditor}</h4>
                        {audit.auditorSignature ? (
                            <Image src={audit.auditorSignature} alt="Auditor Signature" width={300} height={150} className="rounded-md border bg-white"/>
                        ) : canSign(user, audit.auditor) ? (
                             <SignaturePad onSubmit={(signature) => onUpdate({ ...audit, auditorSignature: signature }, true)} />
                        ) : (
                            <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
                        )}
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Auditee: {audit.auditeeName}</h4>
                         {audit.auditeeSignature ? (
                            <Image src={audit.auditeeSignature} alt="Auditee Signature" width={300} height={150} className="rounded-md border bg-white"/>
                        ) : canSign(user, audit.auditeeName) ? (
                             <SignaturePad onSubmit={(signature) => onUpdate({ ...audit, auditeeSignature: signature }, true)} />
                        ) : (
                            <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
                        )}
                    </div>
                </CardContent>
            </Card>
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

    const cleanAudit = JSON.parse(JSON.stringify(updatedAudit, (key, value) => {
        return value === undefined ? null : value;
    }));

    setAudit(cleanAudit); 
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
                  <CardTitle className="text-2xl">{audit.title}</CardTitle>
                  <CardDescription>
                  Conducting {audit.type} audit on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                  </CardDescription>
              </div>
              <Badge variant="outline">{audit.status}</Badge>
              </div>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm border-t pt-6">
                  <div>
                      <p className="font-semibold text-muted-foreground">Area Audited</p>
                      <p>{audit.area}</p>
                  </div>
                  <div>
                      <p className="font-semibold text-muted-foreground">Audit Type</p>
                      <p>{audit.type}</p>
                  </div>
                   <div>
                      <p className="font-semibold text-muted-foreground">Auditor</p>
                      <p>{audit.auditor}</p>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                      <p className="font-semibold text-muted-foreground">Auditee</p>
                      <p>{audit.auditeeName || 'Not yet assigned'}</p>
                  </div>
                  {audit.investigationTeam && audit.investigationTeam.length > 0 && (
                        <div className="md:col-span-4">
                            <p className="font-semibold text-muted-foreground">Team Members</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {audit.investigationTeam.map(member => <Badge key={member} variant="secondary">{member}</Badge>)}
                            </div>
                        </div>
                    )}
              </div>
               {audit.evidenceReference && (
                <div className="space-y-2 border-t pt-6">
                    <Label htmlFor="audit-evidence" className="font-semibold">Evidence Reference / Scope</Label>
                    <Textarea 
                        id="audit-evidence"
                        readOnly
                        value={audit.evidenceReference}
                        className="min-h-[100px] bg-muted"
                    />
                </div>
              )}
              <div className="space-y-2 border-t pt-6">
                  <Label htmlFor="audit-summary" className="font-semibold">Audit Summary</Label>
                  <Textarea 
                  id="audit-summary"
                  placeholder="Enter the overall audit summary here..."
                  className="min-h-[100px]"
                  value={audit.summary}
                  onChange={(e) => handleAuditUpdate({ ...audit, summary: e.target.value }, false)}
                  />
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
                                              <Label className="text-sm font-medium">Finding</Label>
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
                                              <Label className="text-sm font-medium">Level</Label>
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
                                          <Label className="text-sm font-medium">Reference</Label>
                                          <Textarea
                                              placeholder="Document references, evidence, etc."
                                              value={item.reference || ''}
                                              onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                              />
                                      </div>
                                      <div className="space-y-2">
                                          <Label className="text-sm font-medium">Comment</Label>
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
    

    








