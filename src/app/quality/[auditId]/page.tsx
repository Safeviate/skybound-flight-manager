

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, AuditChecklistItem, User, DiscussionEntry, CorrectiveActionPlan, Alert, Department, FindingOption } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, FileText, Save, Send, PlusCircle, Database, Check, Percent, Bot, Printer, Rocket, ArrowLeft, Signature, Eraser, Users, Camera, Image as ImageIcon, RotateCw, FileUp, Trash2, ChevronDown } from 'lucide-react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { StandardCamera } from '@/components/ui/standard-camera';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
        case 'Non Compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        case 'Not Applicable': return { icon: <Ban className="h-5 w-5 text-gray-500" />, variant: 'outline' as const, text: 'N/A' };
        default: return { icon: <ListChecks className="h-5 w-5" />, variant: 'outline' as const, text: 'Not Set' };
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

const levelOptions: FindingLevel[] = ['Level 1 Finding', 'Level 2 Finding', 'Level 3 Finding', 'Observation'];

const AuditReportView = ({ audit, onUpdate, personnel, onNavigateBack }: { audit: QualityAudit, onUpdate: (updatedAudit: QualityAudit, showToast?: boolean) => void, personnel: User[], onNavigateBack: () => void }) => {
    const { user, company } = useUser();
    const { toast } = useToast();
    const discussionForm = useForm<DiscussionFormValues>({
        resolver: zodResolver(discussionFormSchema),
    });

    const [isDiscussionDialogOpen, setIsDiscussionDialogOpen] = React.useState(false);
    const [isSigning, setIsSigning] = React.useState(false);

    const availableRecipients = React.useMemo(() => {
        if (!audit.investigationTeam || !user) return [];
        return audit.investigationTeam.filter(name => name !== user.name);
    }, [audit.investigationTeam, user]);


    const handleReply = (recipient: string) => {
        discussionForm.setValue('recipient', recipient);
        setIsDiscussionDialogOpen(true);
    };

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
                    title: `Signature Required: Audit ${audit.auditNumber || audit.id.substring(0,8)}`,
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
        onUpdate({ ...audit, auditorSignature: undefined, auditeeSignature: undefined, auditorSignatureDate: undefined, auditeeSignatureDate: undefined }, true);
        toast({
            title: 'Signatures Cleared',
            description: 'The signature fields for this audit have been reset.',
        });
    };
    
    const handleReopenAudit = () => {
        onUpdate({ ...audit, status: 'Open' }, true);
        toast({
            title: 'Audit Reopened',
            description: 'The audit has been reopened for further editing.',
        });
    };

    const canSign = (user: User | null, personName: string | null | undefined): boolean => {
      if (!user || !personName || user.name !== personName) return false;
      const hasSignPermission = user.permissions.includes('Quality:Sign') || user.permissions.includes('Super User');
      return hasSignPermission;
    };
    
    return (
        <div id="printable-report-area" className="space-y-6 print:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 no-print">
                <Button variant="outline" onClick={onNavigateBack} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Audits
                </Button>
                {audit.status === 'Closed' && (
                    <Button variant="outline" onClick={handleReopenAudit} className="w-full">
                        <RotateCw className="mr-2 h-4 w-4" /> Reopen Audit
                    </Button>
                )}
                <Button variant="outline" onClick={handleRequestSignatures} className="w-full">
                    <Signature className="mr-2 h-4 w-4" />
                    Request Signatures
                </Button>
                <Button variant="destructive" size="sm" onClick={handleResetSignatures} className="w-full">
                    <Eraser className="mr-2 h-4 w-4" />
                    Reset Signatures
                </Button>
                <Button variant="outline" onClick={() => window.print()} className="w-full">
                    <Printer className="mr-2 h-4 w-4" />
                    Print Report
                </Button>
            </div>

             <Card className="print:shadow-none print:border-none">
                <CardHeader>
                    {/* THIS IS THE STANDARD DOCUMENT HEADER. ALL REPORTS/FORMS SHOULD FOLLOW THIS FORMAT. */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            {company?.logoUrl && (
                                <Image
                                    src={company.logoUrl}
                                    alt={`${company.name} Logo`}
                                    width={80}
                                    height={80}
                                    className="h-20 w-20 rounded-md object-contain"
                                />
                            )}
                        </div>
                        <div className="flex-1 text-center">
                            <CardTitle>{company?.name}</CardTitle>
                            <CardDescription>Quality Audit Report</CardDescription>
                        </div>
                        <div className="w-16 flex justify-end">
                            <Badge variant="success">{audit.status}</Badge>
                        </div>
                    </div>
                    <Separator className="my-4"/>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="mt-2 text-2xl">{audit.auditNumber || audit.id}: {audit.title}</CardTitle>
                            <CardDescription>
                            Audit Date: {format(parseISO(audit.date), 'MMMM d, yyyy')} | Type: {audit.type}
                            </CardDescription>
                        </div>
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
                    {audit.scope && (
                        <div className="pt-2">
                            <h4 className="font-semibold text-sm">Audit Scope</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-2 border rounded-md min-h-[60px]">{audit.scope}</p>
                        </div>
                    )}
                    {audit.evidenceReference && (
                        <div className="pt-2">
                            <h4 className="font-semibold text-sm">Evidence Reference</h4>
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
                            <p className="text-sm text-muted-foreground p-2 border rounded-md min-h-[60px] whitespace-pre-wrap">{audit.summary || 'No summary was provided.'}</p>
                        </CardContent>
                    </Card>

                    {audit.nonConformanceIssues.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Non-Conformance Report</CardTitle>
                                <CardDescription>Details of all non-compliant findings from this audit.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    let nonConformanceCounter = 1;
                                    return audit.nonConformanceIssues.map(issue => {
                                        const issueText = `Non-Conformance: ${issue.itemText}\nLevel: ${issue.level}\nRegulation: ${issue.regulationReference}\n\nAuditor Comment:\n${issue.comment}`;
                                        return (
                                            <div key={issue.id} className="p-4 border rounded-lg mb-4 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <Badge variant={getLevelInfo(issue.level)?.variant || 'secondary'}>{issue.level}</Badge>
                                                        <p className="font-medium mt-2">{nonConformanceCounter++}. {issue.itemText}</p>
                                                        <p className="text-xs text-muted-foreground">{issue.regulationReference || 'N/A'}</p>
                                                        <p className="text-sm mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">{issue.comment}</p>
                                                    </div>
                                                </div>
                                               {issue.correctiveActionPlans && issue.correctiveActionPlans.length > 0 && (
                                                <div className="space-y-4">
                                                  <h4 className="font-semibold text-sm">Corrective Action Plan(s)</h4>
                                                  {issue.correctiveActionPlans.map((plan, planIndex) => (
                                                    <div key={planIndex} className="p-3 border rounded-md space-y-2 bg-background">
                                                      <div>
                                                        <p className="font-medium text-muted-foreground text-sm">Root Cause</p>
                                                        <p className="text-sm">{plan.rootCause}</p>
                                                      </div>
                                                      <div>
                                                        <p className="font-medium text-muted-foreground text-sm">Actions</p>
                                                        <ul className="list-disc pl-5 text-sm">
                                                          {plan.actions.map(action => (
                                                            <li key={action.id} className="mb-1">
                                                              <span className={cn(action.status === 'Closed' && "line-through text-muted-foreground")}>
                                                                {action.action}
                                                              </span>
                                                              <div className="text-xs text-muted-foreground">
                                                                {action.responsiblePerson} - Due: {format(parseISO(action.completionDate), 'PPP')} - <Badge variant={action.status === 'Closed' ? 'success' : 'warning'} className="h-auto py-0 px-1.5">{action.status}</Badge>
                                                              </div>
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                        )
                                    })
                                })()}
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
                            {(() => {
                                let questionNumber = 0;
                                return audit.checklistItems.map(item => {
                                    if (item.type !== 'Header') {
                                        questionNumber++;
                                    }
                                    if (item.finding !== 'Non Compliant' && item.finding !== 'Partial') {
                                        const { icon, variant, text } = getFindingInfo(item.finding);
                                        return (
                                            <div key={item.id} className="p-4 border rounded-lg mb-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{item.type !== 'Header' && `${questionNumber}. `}{item.text}</p>
                                                        <div className="text-xs text-muted-foreground">
                                                            <p>Regulation: {item.regulationReference || 'N/A'}</p>
                                                            <p>Reference: {item.reference || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={variant} className="whitespace-nowrap">
                                                        {icon}
                                                        <span className="ml-2">{text}</span>
                                                    </Badge>
                                                </div>
                                                {item.comment && <p className="text-sm mt-2 p-2 bg-muted rounded-md whitespace-pre-wrap">{item.comment}</p>}
                                                {item.photo && <Image src={item.photo} alt={`Photo for ${item.text}`} width={200} height={112} className="mt-2 rounded-md" />}
                                                {item.suggestedImprovement && (
                                                    <div className="mt-2">
                                                        <p className="text-xs font-semibold text-primary">Suggested Improvement:</p>
                                                        <p className="text-sm p-2 bg-primary/10 rounded-md whitespace-pre-wrap">{item.suggestedImprovement}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }
                                    return null;
                                })
                            })()}
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
                            {(() => {
                                let questionNumber = 1;
                                return audit.checklistItems.map(item => {
                                    if (item.type === 'Header') {
                                        return <h3 key={item.id} className="text-lg font-semibold mt-6 mb-2 border-b pb-2">{item.text}</h3>;
                                    }
                                    const { icon, variant, text } = getFindingInfo(item.finding);
                                    const currentQuestionNumber = questionNumber++;
                                    return (
                                        <div key={item.id} className="p-4 border rounded-lg mb-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{currentQuestionNumber}. {item.text}</p>
                                                    <div className="text-xs text-muted-foreground ml-5">
                                                        <p>Regulation: {item.regulationReference || 'N/A'}</p>
                                                        <p>Reference: {item.reference || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={variant} className="whitespace-nowrap">
                                                    {icon}
                                                    <span className="ml-2">{text}</span>
                                                </Badge>
                                            </div>
                                            {item.comment && <p className="text-sm mt-2 p-2 bg-muted rounded-md whitespace-pre-wrap">{item.comment}</p>}
                                            {item.photo && <Image src={item.photo} alt={`Photo for ${item.text}`} width={200} height={112} className="mt-2 rounded-md" />}
                                            {item.suggestedImprovement && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-primary">Suggested Improvement:</p>
                                                    <p className="text-sm p-2 bg-primary/10 rounded-md whitespace-pre-wrap">{item.suggestedImprovement}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            })()}
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
                                                                data-nosnippet
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
                            <div>
                                <Image src={audit.auditorSignature} alt="Auditor Signature" width={300} height={150} className="rounded-md border bg-white"/>
                                {audit.auditorSignatureDate && (
                                    <p className="text-xs text-muted-foreground mt-1">Signed on: {format(parseISO(audit.auditorSignatureDate), 'PPP p')}</p>
                                )}
                            </div>
                        ) : canSign(user, audit.auditor) ? (
                             <SignaturePad onSubmit={(signature) => onUpdate({ ...audit, auditorSignature: signature, auditorSignatureDate: new Date().toISOString() }, true)} />
                        ) : (
                            <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
                        )}
                    </div>
                     <div className="space-y-2">
                        <h4 className="font-semibold">Auditee: {audit.auditeeName}</h4>
                         {audit.auditeeSignature ? (
                            <div>
                                <Image src={audit.auditeeSignature} alt="Auditee Signature" width={300} height={150} className="rounded-md border bg-white"/>
                                {audit.auditeeSignatureDate && (
                                    <p className="text-xs text-muted-foreground mt-1">Signed by {audit.auditeeName} on: {format(parseISO(audit.auditeeSignatureDate), 'PPP p')}</p>
                                )}
                            </div>
                        ) : canSign(user, audit.auditeeName) ? (
                             <SignaturePad onSubmit={(signature) => onUpdate({ ...audit, auditeeSignature: signature, auditeeSignatureDate: new Date().toISOString() }, true)} />
                        ) : (
                            <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const MAX_FILE_SIZE = 500000;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export default function QualityAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [savedAudit, setSavedAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const auditId = params.auditId as string;
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [cameraItemId, setCameraItemId] = useState<string | null>(null);
  const [isBackAlertOpen, setIsBackAlertOpen] = useState(false);

  
  const finalFindingOptions = useMemo(() => 
    (company?.findingOptions?.length ?? 0) > 0 
      ? company!.findingOptions! 
      : [
          {id: '1', name: 'Compliant'},
          {id: '2', name: 'Non Compliant'},
          {id: '3', name: 'Partial'},
          {id: '4', name: 'Observation'},
          {id: '5', name: 'Not Applicable'},
        ],
    [company?.findingOptions]
  );
  
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    const companyId = company?.id;
    if (!companyId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.' });
        setLoading(false);
        return;
    }
    
    const fetchAuditAndPersonnel = async () => {
      setLoading(true);
      try {
        const auditRef = doc(db, `companies/${companyId}/quality-audits`, auditId);
        const personnelQuery = collection(db, `companies/${companyId}/users`);
        
        const [auditSnap, personnelSnapshot] = await Promise.all([
          getDoc(auditRef),
          getDocs(personnelQuery)
        ]);

        if (auditSnap.exists()) {
          const fetchedAudit = { ...auditSnap.data(), id: auditSnap.id } as QualityAudit;
          setAudit(fetchedAudit);
          setSavedAudit(fetchedAudit); // Set initial saved state
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Audit not found.' });
        }
        
        setPersonnel(personnelSnapshot.docs.map(doc => doc.data() as User));

      } catch (error) {
        console.error("Error fetching audit details:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch audit details.' });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAuditAndPersonnel();
  }, [auditId, user, userLoading, router, toast, company]);

  const hasUnsavedChanges = JSON.stringify(audit) !== JSON.stringify(savedAudit);

  
  const handleItemChange = useCallback((itemId: string, field: keyof AuditChecklistItem, value: any) => {
    if (!audit) return;
    const updatedItems = audit.checklistItems.map(item => 
        item.id === itemId ? { ...item, [field]: value } : item
    );
    setAudit(prevAudit => prevAudit ? { ...prevAudit, checklistItems: updatedItems } : null);
  }, [audit]);

  const handleAuditUpdate = async (updatedAudit: QualityAudit, showToast = true) => {
    if (!company) return;

    const cleanAudit = JSON.parse(JSON.stringify(updatedAudit, (key, value) => {
        return value === undefined ? null : value;
    }));

    setAudit(cleanAudit); 
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        await setDoc(auditRef, cleanAudit, { merge: true });
        setSavedAudit(cleanAudit); // Update saved state after successful save
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

    const totalApplicableItems = audit.checklistItems.filter(item => item.finding !== 'Not Applicable' && item.type !== 'Header').length;
    const compliantItems = audit.checklistItems.filter(item => item.finding === 'Compliant').length;
    const complianceScore = totalApplicableItems > 0 ? Math.round((compliantItems / totalApplicableItems) * 100) : 100;

    const nonConformanceIssues = audit.checklistItems
        .filter(item => item.finding === 'Non Compliant' || item.finding === 'Partial' || item.finding === 'Observation')
        .map(item => ({
            id: `${item.id}-${Date.now()}`, // Ensure unique ID for non-conformance issue
            itemText: item.text,
            regulationReference: item.regulationReference,
            finding: item.finding!,
            level: item.level!,
            comment: item.comment,
            reference: item.reference,
            correctiveActionPlans: [],
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

  const handlePhotoSuccess = (dataUrl: string) => {
    if (cameraItemId) {
        handleItemChange(cameraItemId, 'photo', dataUrl);
    }
    setCameraItemId(null);
  };
  
  const handleFileChange = useCallback((file: File, itemId: string) => {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 500KB.' });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only JPG, PNG, and WEBP are accepted.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleItemChange(itemId, 'photo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [toast, handleItemChange]);


  const handleNavigateBack = () => {
    if (hasUnsavedChanges) {
      setIsBackAlertOpen(true);
    } else {
      router.push('/quality?tab=audits');
    }
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
       <AlertDialog open={isBackAlertOpen} onOpenChange={setIsBackAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/quality?tab=audits')}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAuditClosed ? (
          <AuditReportView audit={audit} onUpdate={handleAuditUpdate} personnel={personnel} onNavigateBack={handleNavigateBack} />
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
                      <p className="font-semibold text-muted-foreground">Department</p>
                      <p>{audit.department || 'N/A'}</p>
                  </div>
                  <div>
                      <p className="font-semibold text-muted-foreground">Area Audited</p>
                      <p>{audit.area}</p>
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
               {audit.scope && (
                <div className="space-y-2 border-t pt-6">
                    <Label htmlFor="audit-scope" className="font-semibold">Audit Scope</Label>
                    <Textarea 
                        id="audit-scope"
                        readOnly
                        value={audit.scope}
                        className="min-h-[100px] bg-muted whitespace-pre-wrap"
                    />
                </div>
              )}
              {audit.evidenceReference && (
                <div className="space-y-2 border-t pt-6">
                    <Label htmlFor="audit-evidence" className="font-semibold">Evidence Reference</Label>
                    <Textarea 
                        id="audit-evidence"
                        readOnly
                        value={audit.evidenceReference}
                        className="min-h-[100px] bg-muted whitespace-pre-wrap"
                    />
                </div>
              )}
              <div className="space-y-2 border-t pt-6">
                  <Label htmlFor="audit-summary" className="font-semibold">Audit Summary</Label>
                  <Textarea 
                  id="audit-summary"
                  placeholder="Enter the overall audit summary here..."
                  className="min-h-[100px] whitespace-pre-wrap"
                  value={audit.summary}
                  onChange={(e) => setAudit({ ...audit, summary: e.target.value })}
                  />
              </div>
          </CardContent>
          </Card>

          <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Audit Checklist</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button variant="outline" onClick={handleNavigateBack} className="w-full sm:w-auto">
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back to Audits
                      </Button>
                      <Button onClick={() => handleAuditUpdate(audit, false)} className="w-full sm:w-auto">
                          <Save className="mr-2 h-4 w-4" />
                          Save Progress
                      </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  {audit.checklistItems && audit.checklistItems.length > 0 ? (
                      <div className="space-y-4">
                          {(() => {
                                let questionNumber = 1;
                                return audit.checklistItems.map(item => {
                                    if (item.type === 'Header') {
                                        return <h3 key={item.id} className="text-lg font-semibold mt-6 mb-2 border-b pb-2">{item.text}</h3>;
                                    }
                                    const findingInfo = getFindingInfo(item.finding);
                                    const levelInfo = getLevelInfo(item.level);
                                    const showLevelSelect = item.finding === 'Non Compliant' || item.finding === 'Partial';
                                    const currentQuestionNumber = questionNumber++;
                                    const fileInputId = `file-input-${item.id}`;
                                    return (
                                        <Collapsible key={item.id} className="p-4 border rounded-lg">
                                            <CollapsibleTrigger asChild>
                                                <div className="flex justify-between items-center cursor-pointer">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{currentQuestionNumber}. {item.text}</p>
                                                        {item.regulationReference && <p className="text-xs text-muted-foreground ml-5">Regulation: {item.regulationReference}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        {item.finding && (
                                                            <Badge variant={findingInfo.variant} className="whitespace-nowrap">
                                                                {findingInfo.icon}
                                                                <span className="ml-2">{findingInfo.text}</span>
                                                            </Badge>
                                                        )}
                                                        {levelInfo && (
                                                            <Badge variant={levelInfo.variant} className="whitespace-nowrap">
                                                                {item.level}
                                                            </Badge>
                                                        )}
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="pt-4 mt-4 border-t space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Finding</Label>
                                                        <Select value={item.finding || ''} onValueChange={(value: FindingStatus) => handleItemChange(item.id, 'finding', value)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Finding" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {finalFindingOptions.map(opt => (
                                                                    <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {showLevelSelect && (
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
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Reference</Label>
                                                    <Textarea
                                                        placeholder="Document references, evidence, etc."
                                                        value={item.reference || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'reference', e.target.value)}
                                                        className="whitespace-pre-wrap"
                                                        />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Comment</Label>
                                                    <Textarea
                                                        placeholder="Auditor comments, observations..."
                                                        value={item.comment || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'comment', e.target.value)}
                                                        className="whitespace-pre-wrap"
                                                        />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Suggested Improvement</Label>
                                                    <Textarea
                                                        placeholder="Provide a suggestion for improvement..."
                                                        value={item.suggestedImprovement || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'suggestedImprovement', e.target.value)}
                                                        className="whitespace-pre-wrap"
                                                        />
                                                </div>
                                                <div className="space-y-4 pt-4 border-t">
                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Button variant="outline" size="sm" onClick={() => setCameraItemId(item.id)}>
                                                                <Camera className="mr-2 h-4 w-4" />
                                                                {item.photo ? 'Retake Photo' : 'Take Photo'}
                                                            </Button>
                                                            <Button variant="outline" size="sm" asChild>
                                                                <label htmlFor={fileInputId} className="cursor-pointer">
                                                                    <FileUp className="mr-2 h-4 w-4" />
                                                                    {item.photo ? 'Change' : 'Upload'}
                                                                </label>
                                                            </Button>
                                                            <Input
                                                                id={fileInputId}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => e.target.files && handleFileChange(e.target.files[0], item.id)}
                                                            />
                                                            {item.photo && (
                                                                <>
                                                                <ImageIcon className="h-5 w-5 text-green-500" />
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleItemChange(item.id, 'photo', null)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )
                                })
                            })()}
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

      {/* Camera Dialog */}
      <Dialog open={!!cameraItemId} onOpenChange={(isOpen) => !isOpen && setCameraItemId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Take Photo</DialogTitle>
                <DialogDescription>Attach a photo as evidence for this checklist item.</DialogDescription>
            </DialogHeader>
            <StandardCamera onSuccess={handlePhotoSuccess} />
        </DialogContent>
      </Dialog>
    </main>
  );
}

QualityAuditDetailPage.title = "Quality Audit Investigation";
    

    

