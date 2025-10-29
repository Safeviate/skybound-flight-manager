
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
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const };
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
    
    const nonConformances = useMemo(() => audit.checklistItems.filter(item => item.finding === 'Non Compliant' || item.finding === 'Partial'), [audit.checklistItems]);
    const observations = useMemo(() => audit.checklistItems.filter(item => item.finding === 'Observation'), [audit.checklistItems]);
    const otherFindings = useMemo(() => audit.checklistItems.filter(item => !nonConformances.some(nc => nc.id === item.id) && !observations.some(obs => obs.id === item.id)), [audit.checklistItems, nonConformances, observations]);


    const availableRecipients = React.useMemo(() => {
        if (!audit.auditTeam || !user) return [];
        return audit.auditTeam.filter(name => name !== user.name);
    }, [audit.auditTeam, user]);


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
          : audit.auditTeam?.filter((name) => name !== user.name) || [];

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
                            <p className="text-3xl font-bold text-destructive">{nonConformances.length}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Observations</p>
                            <p className="text-3xl font-bold">{observations.length}</p>
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
                            <h4 className="font-semibold text-sm">Audit Reference</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap p-2 border rounded-md min-h-[60px]">{audit.evidenceReference}</p>
                        </div>
                    )}
                     <div className="pt-2">
                        <h4 className="font-semibold text-sm">Audit Summary</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap p-2 border rounded-md min-h-[60px]">{audit.summary || 'No summary was provided.'}</p>
                    </div>
                </CardContent>
            </Card>

            <AuditTeamForm audit={audit} onUpdate={onUpdate} personnel={personnel} />

            {nonConformances.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Non-Conformance Report</CardTitle>
                        <CardDescription>Details of all non-compliant findings from this audit.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {nonConformances.map((issue, index) => (
                            <div key={issue.id} className="p-4 border rounded-lg mb-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={getFindingInfo(issue.finding).variant}>{issue.finding}</Badge>
                                            {issue.level && <Badge variant={getLevelInfo(issue.level)?.variant || 'secondary'}>{issue.level}</Badge>}
                                        </div>
                                        <p className="font-medium mt-2">{index + 1}. {issue.text}</p>
                                        <p className="text-xs text-muted-foreground">{issue.regulationReference || 'N/A'}</p>
                                        <p className="text-sm mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">{issue.comment}</p>
                                        {issue.photo && <Image src={issue.photo} alt={`Photo for ${issue.text}`} width={200} height={112} className="mt-2 rounded-md" />}
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
                        ))}
                    </CardContent>
                </Card>
            )}
            
            {observations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Observations</CardTitle>
                        <CardDescription>Items noted during the audit that are not non-conformances but could lead to improvements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {observations.map((item, index) => (
                            <div key={item.id} className="p-4 border rounded-lg mb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={getFindingInfo(item.finding).variant}>{item.finding}</Badge>
                                            {item.level && <Badge variant="secondary">{item.level}</Badge>}
                                        </div>
                                        <p className="font-medium mt-2">{index + 1}. {item.text}</p>
                                        <p className="text-xs text-muted-foreground">{item.regulationReference || 'N/A'}</p>
                                    </div>
                                </div>
                                {item.comment && <p className="text-sm mt-2 p-2 bg-muted rounded-md whitespace-pre-wrap">{item.comment}</p>}
                                {item.photo && <Image src={item.photo} alt={`Photo for ${item.text}`} width={200} height={112} className="mt-2 rounded-md" />}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Additional Checklist Findings</CardTitle>
                    <CardDescription>
                        A log of all compliant or not-applicable items from the audit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(() => {
                        let questionNumber = 0;
                        return otherFindings.map(item => {
                            if (item.type === 'Header') {
                                return <h3 key={item.id} className="text-lg font-semibold mt-6 mb-2 border-b pb-2">{item.text}</h3>;
                            }
                            const { icon, variant, text } = getFindingInfo(item.finding);
                            const currentQuestionNumber = ++questionNumber;
                            return (
                                <div key={item.id} className="p-4 border rounded-lg mb-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium">{currentQuestionNumber}. {item.text}</p>
                                            <p className="text-xs text-muted-foreground">{item.regulationReference || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={variant} className="whitespace-nowrap">
                                                {icon}
                                                <span className="ml-2">{text}</span>
                                            </Badge>
                                        </div>
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
  const { toast } }
    