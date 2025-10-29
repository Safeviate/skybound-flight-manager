

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
    
    if (!company?.id || !auditId) {
        setLoading(false);
        return;
    }
    
    const fetchAuditAndPersonnel = async () => {
        setLoading(true);
        try {
            const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
            const personnelQuery = collection(db, `companies/${company.id}/users`);
            
            const [auditSnap, personnelSnapshot] = await Promise.all([
                getDoc(auditRef),
                getDocs(personnelQuery)
            ]);

            if (auditSnap.exists()) {
                const fetchedAudit = { ...auditSnap.data(), id: auditSnap.id } as QualityAudit;
                setAudit(fetchedAudit);
                setSavedAudit(fetchedAudit);
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
  
    const updatedItems = audit.checklistItems.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'finding') {
            updatedItem.level = null;
        }
        return updatedItem;
      }
      return item;
    });
  
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

    const nonConformanceIssues: NonConformanceIssue[] = audit.checklistItems
        .filter(item => item.finding === 'Non Compliant' || item.finding === 'Partial')
        .map(item => ({
            id: `${item.id}-${Date.now()}`,
            itemText: item.text,
            regulationReference: item.regulationReference,
            finding: item.finding!,
            level: item.level!,
            comment: item.comment,
            reference: item.reference,
            correctiveActionPlans: [],
            photo: item.photo,
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
                      <p className="font-semibold text-muted-foreground">Audit Reference</p>
                      <p>{audit.area || 'N/A'}</p>
                  </div>
                   <div>
                      <p className="font-semibold text-muted-foreground">Auditor</p>
                      <p>{audit.auditor}</p>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                      <p className="font-semibold text-muted-foreground">Auditee</p>
                      <p>{audit.auditeeName || 'Not yet assigned'}</p>
                  </div>
                  {audit.auditTeam && audit.auditTeam.length > 0 && (
                        <div className="md:col-span-4">
                            <p className="font-semibold text-muted-foreground">Team Members</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {audit.auditTeam.map(member => <Badge key={member} variant="secondary">{member}</Badge>)}
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
                    <Label htmlFor="audit-evidence" className="font-semibold">Audit Reference</Label>
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
                      <Button onClick={() => handleAuditUpdate(audit, true)} className="w-full sm:w-auto">
                          <Save className="mr-2 h-4 w-4" />
                          Save Progress
                      </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  {audit.checklistItems && audit.checklistItems.length > 0 ? (
                      <div className="space-y-4">
                          {(() => {
                                let questionNumber = 0;
                                return audit.checklistItems.map(item => {
                                    if (item.type === 'Header') {
                                        return <h3 key={item.id} className="text-lg font-semibold mt-6 mb-2 border-b pb-2">{item.text}</h3>;
                                    }
                                    const findingInfo = getFindingInfo(item.finding);
                                    const levelInfo = getLevelInfo(item.level);
                                    const showLevelSelect = item.finding === 'Non Compliant' || item.finding === 'Partial';
                                    const currentQuestionNumber = ++questionNumber;
                                    const fileInputId = `file-input-${item.id}`;
                                    
                                    let levelDropdownOptions = levelOptions;
                                    if (item.finding === 'Compliant' || item.finding === 'Observation') {
                                        levelDropdownOptions = ['Observation'];
                                    } else if (item.finding === 'Non Compliant' || item.finding === 'Partial') {
                                        levelDropdownOptions = levelOptions.filter(opt => opt !== 'Observation');
                                    }


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
                                                                    {levelDropdownOptions.map(opt => (
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

```
- workspaces/app/.firebase/hosting.Y2x1cHRlc3Q/.firebaserc:
```

{
  "projects": {
    "default": "skybound-flight-manager"
  }
}
```
- workspaces/app/.firebase/hosting.Y2x1cHRlc3Q/firebase.json:
```json
{
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "frameworksBackend": {
      "region": "us-central1"
    }
  }
}

```
- workspaces/app/.github/workflows/firebase-hosting-pull-request.yml:
```yml
# This file was auto-generated by the Firebase CLI
# https://github.com/firebase/firebase-tools

name: Deploy to Firebase Hosting on PR
on: pull_request
permissions:
  checks: write
  contents: read
  pull-requests: write
jobs:
  build_and_preview:
    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_SKYBOUND_FLIGHT_MANAGER }}
          projectId: skybound-flight-manager

```
- workspaces/app/src/app/personnel/personnel-page-content.tsx:
```tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Mail, Phone, Archive, RotateCw, KeyRound, MessageSquare, Copy } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { resetUserPasswordAndSendWelcomeEmail, manuallyResetPassword } from '@/app/actions';
import { adminResetPassword } from '@/ai/flows/admin-reset-password-flow';
import { adminSendSms } from '@/ai/flows/admin-send-sms-flow';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPersonnelForm } from './edit-personnel-form';
import { useSettings } from '@/context/settings-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getPersonnelPageData } from './data';
import { Separator } from '@/components/ui/separator';
import { ALL_DOCUMENTS } from '@/lib/types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function PersonnelPageContent({ initialPersonnel }: { initialPersonnel: PersonnelUser[] }) {
    const { user, company, loading } = useUser();
    const { settings } = useSettings();
    const router = useRouter();
    const [personnel, setPersonnel] = useState<PersonnelUser[]>(initialPersonnel);
    const [isNewPersonnelOpen, setIsNewPersonnelOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<PersonnelUser | null>(null);
    const [viewingDocumentsFor, setViewingDocumentsFor] = useState<PersonnelUser | null>(null);
    const [manualPassword, setManualPassword] = useState<{ name: string; pass: string } | null>(null);
    const { toast } = useToast();
    const [passwordResetFor, setPasswordResetFor] = useState<PersonnelUser | null>(null);
    const [tempPassword, setTempPassword] = useState('');
    
    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');
    const canCreateTempPassword = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:CreateTempPassword');


    useEffect(() => {
        setPersonnel(initialPersonnel);
    }, [initialPersonnel]);

    const groupPersonnelByDepartment = (personnelList: PersonnelUser[]) => {
        return personnelList.reduce((acc, person) => {
            const department = person.department || 'Uncategorized';
            if (!acc[department]) {
                acc[department] = [];
            }
            acc[department].push(person);
            return acc;
        }, {} as Record<string, PersonnelUser[]>);
    };

    const activePersonnel = useMemo(() => personnel.filter(p => p.status !== 'Archived'), [personnel]);
    const archivedPersonnel = useMemo(() => personnel.filter(p => p.status === 'Archived'), [personnel]);
    
    const groupedActivePersonnel = useMemo(() => groupPersonnelByDepartment(activePersonnel), [activePersonnel]);
    const groupedArchivedPersonnel = useMemo(() => groupPersonnelByDepartment(archivedPersonnel), [archivedPersonnel]);

    const fetchPersonnel = async () => {
        if (!company) return;
        const personnelData = await getPersonnelPageData(company.id);
        setPersonnel(personnelData);
    };

    const handleSuccess = () => {
        fetchPersonnel();
        setIsNewPersonnelOpen(false);
    }
    
    const handleUpdatePersonnel = async (updatedData: PersonnelUser) => {
        if (!company) return;
        
        try {
            const userRef = doc(db, `companies/${company.id}/users`, updatedData.id);
            const dataToSave = {
                ...updatedData,
                department: updatedData.department || null,
            };
            await updateDoc(userRef, JSON.parse(JSON.stringify(dataToSave)));
            await fetchPersonnel();
            setEditingPersonnel(null);
            toast({ title: 'Personnel Updated', description: `${updatedData.name}'s details have been saved.` });
        } catch (error) {
            console.error('Failed to update personnel:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update personnel details.' });
        }
    };

    const handleStatusChange = async (personnelId: string, newStatus: 'Active' | 'Archived') => {
        if (!company) return;
        const userRef = doc(db, `companies/${company.id}/users`, personnelId);
        try {
            await updateDoc(userRef, { status: newStatus });
            await fetchPersonnel();
            toast({
                title: `Personnel ${newStatus === 'Active' ? 'Reactivated' : 'Archived'}`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleDeletePersonnel = async (personnelId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/users`, personnelId));
            // Note: Deleting from Firebase Auth should be handled by a backend function for security.
            // This implementation only removes the database record.
            await fetchPersonnel();
            toast({ title: 'Personnel Deleted', description: 'The user has been removed from the roster.' });
        } catch (error) {
            console.error("Error deleting personnel:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete personnel.' });
        }
    };
    
    const handleSendWelcomeEmail = async (person: PersonnelUser) => {
        if (!company) return;
        const result = await resetUserPasswordAndSendWelcomeEmail(person, company);
        if (result.success) {
            toast({
                title: 'Welcome Email Sent',
                description: result.message,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Email Failed',
                description: result.message,
            });
        }
    };

    const handleSendSmsLogin = async (person: PersonnelUser) => {
        if (!person.phone) {
            toast({ variant: 'destructive', title: 'Error', description: 'This user does not have a phone number on file.' });
            return;
        }
        try {
            const result = await adminSendSms({ userId: person.id, phone: person.phone });
            if (result.success) {
                toast({
                    title: 'SMS Sent',
                    description: `A login code has been sent to ${person.name} at ${person.phone}.`,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'SMS Failed',
                description: `Could not send SMS: ${error.message}`,
            });
        }
    };
    
    const handleManualPasswordReset = async (person: PersonnelUser) => {
        const result = await manuallyResetPassword(person);
        if (result.success && result.temporaryPassword) {
            setManualPassword({ name: person.name, pass: result.temporaryPassword });
        } else {
             toast({
                variant: 'destructive',
                title: 'Password Reset Failed',
                description: result.message,
            });
        }
    };
    
    const handleCreateTempPassword = (person: PersonnelUser) => {
        const newPassword = Math.random().toString(36).slice(-8);
        setTempPassword(newPassword);
        setPasswordResetFor(person);
    };

    const handleConfirmPasswordReset = async () => {
        if (!passwordResetFor || !company) return;

        const result = await adminResetPassword({ userId: passwordResetFor.id, newPassword: tempPassword });
        if (result.success) {
            const userRef = doc(db, `companies/${company.id}/users`, passwordResetFor.id);
            await updateDoc(userRef, { mustChangePassword: true });
            toast({ title: 'Password Reset Successful', description: `Password for ${passwordResetFor.name} has been updated.` });
        } else {
            toast({ variant: 'destructive', title: 'Password Reset Failed', description: result.message });
        }
    };

    const PersonnelCardList = ({ list, isArchived }: { list: PersonnelUser[], isArchived?: boolean }) => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map(person => (
                <Card key={person.id} className="flex flex-col">
                    <CardHeader>
                            <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{person.name}</CardTitle>
                                <CardDescription>
                                    {person.role}
                                </CardDescription>
                            </div>
                            {canEdit && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setEditingPersonnel(person)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleSendWelcomeEmail(person)}><Mail className="mr-2 h-4 w-4" /> Send Welcome Email</DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <MessageSquare className="mr-2 h-4 w-4" /> Send SMS Login
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm SMS Action</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will send a one-time login code to {person.name} at {person.phone}. Are you sure?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleSendSmsLogin(person)}>Yes, Send SMS</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        {canCreateTempPassword && (
                                            <DropdownMenuItem onSelect={() => handleManualPasswordReset(person)}>
                                                <KeyRound className="mr-2 h-4 w-4" /> Create Manual Password
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onSelect={() => setViewingDocumentsFor(person)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Documents
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {isArchived ? (
                                            <>
                                                <DropdownMenuItem onClick={() => handleStatusChange(person.id, 'Active')}><RotateCw className="mr-2 h-4 w-4" /> Reactivate</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete {person.name}.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeletePersonnel(person.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange(person.id, 'Archived')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm flex-grow">
                        <p className="font-semibold">{person.department}</p>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{person.email || 'No email on file'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{person.phone}</span>
                                </div>
                            </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingDocumentsFor(person)}>
                            <Eye className="mr-2 h-4 w-4" /> View Documents
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
    
    const DepartmentGroup = ({ departmentName, personnelList, isArchived }: { departmentName: string, personnelList: PersonnelUser[], isArchived?: boolean }) => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{departmentName}</h2>
            <PersonnelCardList list={personnelList} isArchived={isArchived} />
        </div>
    );

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Personnel Roster</CardTitle>
                  <CardDescription>A list of all active and archived staff members.</CardDescription>
              </div>
              {canEdit && (
                  <Dialog open={isNewPersonnelOpen} onOpenChange={setIsNewPersonnelOpen}>
                      <DialogTrigger asChild>
                          <Button>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              New Personnel
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                              <DialogTitle>Add New Personnel</DialogTitle>
                              <DialogDescription>
                                  Add a new staff member to the system. This will create their user account.
                              </DialogDescription>
                          </DialogHeader>
                          <NewPersonnelForm onSuccess={handleSuccess} />
                      </DialogContent>
                  </Dialog>
              )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Active Staff ({activePersonnel.length})</TabsTrigger>
                    <TabsTrigger value="archived">Archived Staff ({archivedPersonnel.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4 space-y-8">
                    {Object.keys(groupedActivePersonnel).sort().map(dept => (
                        <DepartmentGroup key={dept} departmentName={dept} personnelList={groupedActivePersonnel[dept]} />
                    ))}
                    {Object.keys(groupedActivePersonnel).length === 0 && (
                        <div className="text-center text-muted-foreground py-10">No active personnel found.</div>
                    )}
                </TabsContent>
                <TabsContent value="archived" className="mt-4 space-y-8">
                    {Object.keys(groupedArchivedPersonnel).sort().map(dept => (
                        <DepartmentGroup key={dept} departmentName={dept} personnelList={groupedArchivedPersonnel[dept]} isArchived />
                    ))}
                     {Object.keys(groupedArchivedPersonnel).length === 0 && (
                        <div className="text-center text-muted-foreground py-10">No archived personnel found.</div>
                    )}
                </TabsContent>
            </Tabs>
          </CardContent>
      </Card>
      {editingPersonnel && (
          <Dialog open={!!editingPersonnel} onOpenChange={() => setEditingPersonnel(null)}>
              <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                      <DialogTitle>Edit Personnel: {editingPersonnel.name}</DialogTitle>
                      <DialogDescription>
                          Update the details for this staff member.
                      </DialogDescription>
                  </DialogHeader>
                  <EditPersonnelForm 
                      personnel={editingPersonnel} 
                      onSubmit={handleUpdatePersonnel} 
                  />
              </DialogContent>
          </Dialog>
      )}
       {viewingDocumentsFor && (
            <Dialog open={!!viewingDocumentsFor} onOpenChange={() => setViewingDocumentsFor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Document Expiry Dates for {viewingDocumentsFor.name}</DialogTitle>
                        <DialogDescription>
                            A list of all official documents and their expiry dates.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {ALL_DOCUMENTS.map(docType => {
                            const userDoc = viewingDocumentsFor.documents?.find(d => d.type === docType);
                            return (
                                <div key={docType} className="flex items-center justify-between text-sm">
                                    <span>{docType}</span>
                                    {getExpiryBadge(userDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                                </div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>
       )}
        <Dialog open={!!passwordResetFor} onOpenChange={() => setPasswordResetFor(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Temporary Password</DialogTitle>
                    <DialogDescription>
                        A new temporary password has been generated for {passwordResetFor?.name}. Please communicate this to them securely. They will be required to change it on their next login.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="p-4 bg-muted rounded-lg text-center font-mono text-xl tracking-widest">
                        {tempPassword}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPasswordResetFor(null)}>Cancel</Button>
                    <Button onClick={handleConfirmPasswordReset}>Confirm &amp; Reset</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={!!manualPassword} onOpenChange={() => setManualPassword(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manual Password for {manualPassword?.name}</DialogTitle>
                    <DialogDescription>
                        Copy this temporary password and share it with the user. They will be required to change it on their next login.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 py-4">
                    <div className="grid flex-1 gap-2">
                        <span className="text-lg font-mono p-2 border rounded-md bg-muted text-center">{manualPassword?.pass}</span>
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={() => { navigator.clipboard.writeText(manualPassword?.pass || ''); toast({title: 'Copied!'}) }}>
                        <span className="sr-only">Copy</span>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    </main>
  );
}

```
- workspaces/app/src/app/safety/[reportId]/investigation-team-form.tsx:
```tsx

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, User, Alert, InvestigationTeamMember } from '@/lib/types';
import { UserPlus, X } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, addDoc } from 'firebase/firestore';

const INVESTIGATION_ROLES: InvestigationTeamMember['role'][] = [
  'Lead Investigator',
  'Investigator',
  'Technical Expert',
  'Observer',
];

const teamFormSchema = z.object({
  userId: z.string().min(1, 'You must select a person to add.'),
  role: z.enum(INVESTIGATION_ROLES, { required_error: 'You must assign a role.'}),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface InvestigationTeamFormProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport, showToast?: boolean) => void;
}

export function InvestigationTeamForm({ report, onUpdate }: InvestigationTeamFormProps) {
  const { toast } = useToast();
  const { user: currentUser, company } = useUser();
  const [team, setTeam] = React.useState<InvestigationTeamMember[]>(report.investigationTeam || []);
  const [allPersonnel, setAllPersonnel] = React.useState<User[]>([]);

  React.useEffect(() => {
    const fetchPersonnel = async () => {
      if (!company) return;
      try {
        const personnelQuery = query(collection(db, `companies/${company.id}/users`));
        const snapshot = await getDocs(personnelQuery);
        setAllPersonnel(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User)));
      } catch (error) {
        console.error("Error fetching personnel:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load personnel list.' });
      }
    };
    fetchPersonnel();
  }, [company, toast]);

  React.useEffect(() => {
    setTeam(report.investigationTeam || []);
  }, [report.investigationTeam]);

  const teamMemberIds = React.useMemo(() => new Set(team.map(m => m.userId)), [team]);

  const availablePersonnel = allPersonnel.filter(
    (u) => u.role !== 'Student' && !teamMemberIds.has(u.id)
  );

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });

  async function onAddMember(data: TeamFormValues) {
    if (!company || !currentUser) return;
    
    const addedUser = allPersonnel.find(p => p.id === data.userId);
    if (!addedUser) return;

    const newMember: InvestigationTeamMember = {
        userId: addedUser.id,
        name: addedUser.name,
        role: data.role,
    };

    const newTeam = [...team, newMember];
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    form.reset();

    if (addedUser) {
        const newAlert: Omit<Alert, 'id' | 'number'> = {
            companyId: company.id,
            type: 'Task',
            title: `Assigned to Investigation: ${report.reportNumber}`,
            description: `You have been added as a ${data.role} to the investigation for safety report: "${report.heading}".`,
            author: currentUser.name,
            date: new Date().toISOString(),
            readBy: [],
            targetUserId: addedUser.id,
            relatedLink: `/safety/${report.id}`,
        };
        const alertsCollection = collection(db, `companies/${company.id}/alerts`);
        await addDoc(alertsCollection, newAlert);
    }
    
    toast({
      title: 'Team Member Added',
      description: `${addedUser.name} has been added to the investigation and notified.`,
    });
  }

  function onRemoveMember(memberId: string) {
    const newTeam = team.filter((m) => m.userId !== memberId);
    const removedMember = team.find(m => m.userId === memberId);
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    toast({
      title: 'Team Member Removed',
      description: `${removedMember?.name} has been removed from the investigation.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {team.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {team.map((member, index) => {
              return (
                <div key={`${member.userId}-${index}`} className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => onRemoveMember(member.userId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No personnel assigned yet.</p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAddMember)} className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Add Team Member</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel to add" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availablePersonnel.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.role})
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
            name="role"
            render={({ field }) => (
              <FormItem className="w-48">
                <FormLabel className="sr-only">Assign Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INVESTIGATION_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
            <UserPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </form>
      </Form>
    </div>
  );
}

```
- workspaces/app/src/lib/types.ts:
```ts

import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
export type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
import type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
export type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
import type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
export type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
import { PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';


export type Airport = {
  id: string;
  name: string;
  coords: {
    lat: number;
    lon: number;
  };
};

export type ThemeColors = {
  primary?: string;
  background?: string;
  card?: string;
  foreground?: string;
  cardForeground?: string;
  headerForeground?: string;
  accent?: string;
  sidebarBackground?: string;
  sidebarForeground?: string;
  sidebarAccent?: string;
  secondary?: string;
  secondaryForeground?: string;
  muted?: string;
  mutedForeground?: string;
  destructive?: string;
  destructiveForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
};

export type Feature = 
    | 'Safety' 
    | 'Quality' 
    | 'Aircraft' 
    | 'Students' 
    | 'Personnel'
    | 'Bookings'
    | 'AdvancedAnalytics';

export type Facility = {
  id: string;
  name: string;
};

export type FindingOption = {
    id: string;
    name: string;
};

export type CompanyAuditArea = {
    id: string;
    name: string;
};

export type BookingPurpose = {
  id: string;
  name: string;
};

export type Company = {
  id: string;
  name: string;
  trademark?: string;
  theme?: Partial<ThemeColors>;
  enabledFeatures?: Feature[];
  logoUrl?: string;
  riskMatrixColors?: Record<string, string>;
  facilities?: Facility[];
  findingOptions?: FindingOption[];
  bookingPurposes?: BookingPurpose[];
  instructorIds?: string[];
  auditAreas?: CompanyAuditArea[];
};

export type AircraftDocument = {
    expiryDate: string | null;
    url?: string | null;
};

export type Aircraft = {
  id: string;
  companyId: string;
  tailNumber: string;
  make: string;
  model: string;
  aircraftType?: 'SE' | 'ME' | 'FSTD';
  status: 'Available' | 'In Maintenance' | 'Booked' | 'Archived';
  hours: number;
  airworthinessDoc: AircraftDocument;
  insuranceDoc: AircraftDocument;
  releaseToServiceDoc: AircraftDocument;
  registrationDoc: AircraftDocument;
  massAndBalanceDoc: AircraftDocument;
  radioLicenseDoc: AircraftDocument;
  location: string; // Airport ID
  checklistStatus?: 'needs-pre-flight' | 'needs-post-flight' | 'ready';
  activeBookingId?: string | null;
  currentTachoReading?: number;
  next50HourInspection?: number;
  next100HourInspection?: number;
  totalTimeInService?: number;
  maintenanceStartDate?: string | null;
  maintenanceEndDate?: string | null;
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type ExerciseLog = {
    exercise: string;
    rating: number;
    comment?: string;
}

export type TrainingLogEntry = {
  id:string;
  date: string;
  aircraft: string;
  make?: string;
  aircraftType?: 'SE' | 'ME' | 'FSTD';
  departure?: string;
  arrival?: string;
  departureTime?: string;
  arrivalTime?: string;
  startHobbs: number;
  endHobbs: number;
  flightDuration: number;
  singleEngineTime?: number;
  multiEngineTime?: number;
  fstdTime?: number;
  dualTime?: number;
  singleTime?: number;
  nightTime?: number;
  dayTime?: number;
  instructorName: string;
  instructorSignature?: string;
  studentSignature?: string;
  studentSignatureRequired?: boolean;
  trainingExercises: ExerciseLog[];
  weatherConditions?: string;
  remarks?: string;
};

export const ALL_DOCUMENTS = [
  "Passport",
  "Visa",
  "Identification",
  "Drivers License",
  "Pilot License",
  "Medical Certificate",
  "Logbook",
  "Airport Permit",
] as const;

export type UserDocument = {
    id: string;
    type: typeof ALL_DOCUMENTS[number];
    expiryDate: string | null;
    url?: string;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Aircraft:UpdateHobbs'
  | 'Aircraft:Maintenance'
  | 'TechnicalLog:View'
  | 'Students:View'
  | 'Students:Edit'
  | 'Personnel:View'
  | 'Personnel:Edit'
  | 'Personnel:CreateTempPassword'
  | 'HireAndFly:View'
  | 'HireAndFly:Edit'
  | 'Safety:View'
  | 'Safety:Edit'
  | 'Quality:View'
  | 'Quality:Edit'
  | 'Quality:Sign'
  | 'Quality:Delete'
  | 'Checklists:View'
  | 'Checklists:Edit'
  | 'Checklists:Complete'
  | 'Alerts:View'
  | 'Alerts:Edit'
  | 'Reports:View'
  | 'Reports:Edit'
  | 'Settings:Edit'
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'MOC:Edit'
  | 'Exams:View'
  | 'Exams:Edit'
  | 'Roles & Departments:View'
  | 'Roles & Departments:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Aircraft:UpdateHobbs',
    'Aircraft:Maintenance',
    'TechnicalLog:View',
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'Personnel:Edit',
    'Personnel:CreateTempPassword',
    'HireAndFly:View',
    'HireAndFly:Edit',
    'Safety:View',
    'Safety:Edit',
    'Quality:View',
    'Quality:Edit',
    'Quality:Sign',
    'Quality:Delete',
    'Checklists:View',
    'Checklists:Edit',
    'Checklists:Complete',
    'Alerts:View',
    'Alerts:Edit',
    'Reports:View',
    'Reports:Edit',
    'Settings:Edit',
    'Bookings:View',
    'Bookings:Edit',
    'MOC:Edit',
    'Exams:View',
    'Exams:Edit',
    'Roles & Departments:View',
    'Roles & Departments:Edit',
    'Super User',
];

export type Role = string;
export type Department = string;

export type NavMenuItem = 'My Dashboard' | 'Company Dashboard' | 'Fleet Track' | 'Aircraft Management' | 'Quick Reports' | 'Alerts' | 'Students' | 'Personnel' | 'Hire and Fly' | 'Training Schedule' | 'Flight Logs' | 'Flight Statistics' | 'Safety' | 'Quality' | 'External Contacts' | 'Appearance' | 'Company Settings' | 'Manage Companies' | 'System Health' | 'Seed Data' | 'Functions' | 'Gantt Chart' | 'Roles & Departments' | 'Meetings' | 'Exams';

export type User = {
    id: string;
    companyId: string;
    name: string;
    role: Role;
    email?: string;
    phone: string;
    emergencyContactNumber?: string;
    password?: string;
    permissions: Permission[];
    visibleMenuItems?: NavMenuItem[];
    consentDisplayContact?: 'Consented' | 'Not Consented';
    mustChangePassword?: boolean;
    homeAddress?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    nextOfKinEmail?: string;
    nextOfKinRelation?: string;
    // Student-specific
    studentCode?: string;
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    licenseType?: 'SPL' | 'PPL';
    milestoneNotificationsSent?: number[];
    // Personnel-specific
    department?: Department;
    documents?: UserDocument[];
    // External Auditee specific
    externalCompanyName?: string;
    externalPosition?: string;
    accessStartDate?: string;
    accessEndDate?: string;
    requiredDocuments?: string[];
};

export type Booking = {
  id: string;
  bookingNumber?: string;
  companyId: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  aircraft: string; // Tail number, or facility name
  resourceType: 'aircraft' | 'facility';
  facilityId?: string;
  title?: string; // For facility bookings
  responsiblePerson?: string; // For facility bookings
  notes?: string; // For facility bookings
  meetingMinutes?: string; // For facility bookings
  student?: string | null;
  studentId?: string | null;
  pilotId?: string | null;
  pilotName?: string | null;
  instructor?: string | null;
  purpose: 'Training' | 'Hire and Fly' | 'Post-Maintenance Flight' | 'Facility Booking' | 'Maintenance' | string;
  status: 'Approved' | 'Completed' | 'Cancelled';
  flightDuration?: number;
  maintenanceType?: string | null;
  trainingExercise?: string;
  cancellationReason?: string;
  startHobbs?: number;
  endHobbs?: number;
  fuelUplift?: number;
  oilUplift?: number;
  departure?: string;
  arrival?: string;
  pendingLogEntryId?: string | null;
  preFlightData?: Partial<PreFlightChecklistFormValues>;
  postFlightData?: Partial<PostFlightChecklistFormValues>;
  preFlightChecklist?: Partial<PreFlightChecklistFormValues>;
  postFlightChecklist?: Partial<PostFlightChecklistFormValues>;
  studentAttendees?: string[];
  personnelAttendees?: string[];
  externalAttendees?: string[];
};

export type SafetyReportType = 'Flight Operations Report' | 'Ground Operations Report' | 'Occupational Report' | 'General Report' | 'Aircraft Defect Report';

export type DiscussionEntry = {
  id: string;
  author: string;
  recipient: string;
  message: string;
  datePosted: string;
  replyByDate?: string;
  isCode?: boolean;
};

export type AssociatedRisk = {
    id: string;
    hazard: string;
    risk: string;
    hazardArea: string;
    process: string;
    likelihood: RiskLikelihood;
    severity: RiskSeverity;
    riskScore: number;
    mitigationControls?: string;
    residualLikelihood?: RiskLikelihood;
    residualSeverity?: RiskSeverity;
    residualRiskScore?: number;
    promotedToRegister?: boolean;
}

export type TaskComment = {
  id: string;
  author: string;
  date: string;
  message: string;
  readBy: string[];
};

export type InvestigationTask = {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'Open' | 'Completed';
  comments?: TaskComment[];
  extensionRequestReason?: string;
  requestedDeadline?: string;
  extensionStatus?: 'Pending' | 'Approved' | 'Rejected' | null;
}

export type InvestigationTeamMember = {
  userId: string;
  name: string;
  role: 'Lead Investigator' | 'Investigator' | 'Technical Expert' | 'Observer';
};

export type SafetyReport = {
  id: string;
  companyId: string;
  reportNumber: string;
  occurrenceDate: string;
  occurrenceTime?: string;
  filedDate: string;
  closedDate?: string;
  submittedBy: string;
  heading: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Closed' | 'Archived';
  type: SafetyReportType;
  department: Department;
  classification?: 'Hazard' | 'Occurrence' | 'Incident' | 'Accident';
  occurrenceCategory?: string;
  subCategory?: string;
  aircraftInvolved?: string;
  location?: string;
  investigationTeam?: InvestigationTeamMember[];
  tasks?: InvestigationTask[];
  investigationNotes?: string;
  discussion?: DiscussionEntry[];
  associatedRisks?: AssociatedRisk[];
  correctiveActionPlan?: GenerateCorrectiveActionPlanOutput;
  fiveWhysAnalysis?: FiveWhysAnalysisOutput;
  aiSuggestedSteps?: SuggestInvestigationStepsOutput;
  // Dynamic fields based on category
  phaseOfFlight?: string;
  crewInvolved?: string;
  pilotInCommand?: string | null;
  pilotFlying?: 'PIC' | 'First Officer' | null;
  raCallout?: string;
  raFollowed?: 'Yes' | 'No' | null;
  weatherConditions?: string;
  visibility?: number;
  windSpeed?: number;
  windDirection?: number;
  birdStrikeDamage?: boolean;
  numberOfBirds?: string;
  sizeOfBirds?: string;
  partOfAircraftStruck?: string;
  eventSubcategoryDetails?: string;

  // Aircraft Defect Report
  systemOrComponent?: string;
  aircraftGrounded?: boolean;

  // Ground Operations Report
  areaOfOperation?: string;
  groundEventType?: string;

  // Occupational Report
  injuryType?: string;
  medicalAttentionRequired?: boolean;
};

export type CorrectiveAction = {
    id: string;
    action: string;
    responsiblePerson: string;
    completionDate: string;
    status: 'Open' | 'Closed' | 'In Progress';
    isPreventative: boolean;
};

export type CorrectiveActionPlan = {
  id: string;
  rootCause: string;
  actions: CorrectiveAction[];
};


export type NonConformanceIssue = {
  id: string;
  itemText: string;
  regulationReference?: string;
  finding: FindingStatus;
  level: FindingLevel;
  comment?: string;
  reference?: string;
  correctiveActionPlans?: CorrectiveActionPlan[];
  photo?: string;
};

export type QualityAudit = {
  id: string;
  companyId: string;
  auditNumber?: string;
  title: string;
  date: string;
  type: 'Internal' | 'External' | 'Self Audit';
  auditor: string;
  auditeeName?: string | null;
  auditeePosition?: string | null;
  area: string;
  department?: Department;
  aircraftInvolved?: string;
  status: 'Open' | 'Closed' | 'Archived';
  complianceScore: number;
  checklistItems: AuditChecklistItem[];
  nonConformanceIssues: NonConformanceIssue[];
  summary: string;
  discussion?: DiscussionEntry[];
  auditTeam?: string[];
  auditeeTeam?: string[];
  auditorSignature?: string;
  auditorSignatureDate?: string;
  auditeeSignature?: string;
  auditeeSignatureDate?: string;
  scope?: string;
  evidenceReference?: string;
};

export type AuditStatus = 'Scheduled' | 'Completed' | 'Pending' | 'Not Scheduled';

export type AuditScheduleItem = {
  id: string;
  companyId?: string;
  area: string;
  year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: AuditStatus;
};

export type AlertAcknowledgement = {
    userId: string;
    date: string;
};

export type Alert = {
  id: string;
  companyId?: string;
  number?: number;
  type: 'Red Tag' | 'Yellow Tag' | 'General Notice' | 'Task' | 'Signature Request' | 'System Health';
  title: string;
  description?: string; // This is now optional as it's replaced by more specific fields
  author: string;
  date: string;
  department?: Department;
  readBy: AlertAcknowledgement[];
  targetUserId?: string;
  relatedLink?: string;
  // New fields
  background?: string;
  purpose?: string;
  instruction?: string;
  reviewDate?: string;
  reviewerId?: string;
};

export type ComplianceItem = {
    id: string;
    companyId: string;
    regulation: string;
    process: string;
    responsibleManager: string;
    lastAuditDate?: string;
    nextAuditDate?: string;
    findings?: string;
};

export type MocMitigation = {
  id: string;
  description: string;
  responsiblePerson?: string;
  completionDate?: string;
  residualLikelihood: RiskLikelihood;
  residualSeverity: RiskSeverity;
  residualRiskScore: number;
};

export type MocRisk = {
  id: string;
  description: string;
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  mitigations?: MocMitigation[];
};

export type MocHazard = {
  id: string;
  description: string;
  risks?: MocRisk[];
};

export type MocStep = {
    id: string;
    description: string;
    hazards?: MocHazard[];
};

export type MocPhase = {
  id: string;
  description: string;
  steps: MocStep[];
};

export type ManagementOfChange = {
  id: string;
  companyId: string;
  mocNumber: string;
  title: string;
  description: string;
  reason: string;
  scope: string;
  proposedBy: string;
  proposalDate: string;
  status: 'Proposed' | 'Under Review' | 'Approved' | 'Rejected' | 'Implemented' | 'Closed';
  phases?: MocPhase[];
  proposerSignature?: string;
  proposerSignatureDate?: string;
  approverName?: string;
  approverSignature?: string;
  approverSignatureDate?: string;
};

export type TechnicalReport = {
  id: string;
  companyId: string;
  reportNumber: string;
  aircraftRegistration: string;
  component: string; // This is now 'System'
  subcomponent?: string; // This is now 'Component'
  otherComponent?: string;
  otherInstrument?: string;
  componentDetails?: string;
  description: string;
  reportedBy: string;
  dateReported: string;
  status?: 'Open' | 'Rectified';
  rectificationDetails?: string;
  componentsReplaced?: string;
  physicalLogEntry?: string;
  rectifiedBy?: string;
  rectificationDate?: string;
  photo?: string;
};

export type ExamQuestion = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswer: string; // This will be the id of the correct option
  explanation?: string;
};

export type ExamAssignment = {
  userId: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Passed' | 'Failed';
  score?: number;
  dateCompleted?: string;
  attemptId?: string; // Link to the detailed ExamAttempt
};

export type Exam = {
  id: string;
  companyId: string;
  title: string;
  category: string;
  questions: ExamQuestion[];
  assignedTo?: ExamAssignment[];
};

export type UserAnswer = {
  questionId: string;
  selectedOptionId: string;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  userId: string;
  dateTaken: string;
  score: number; // Percentage
  answers: UserAnswer[];
};

export const REPORT_TYPE_DEPARTMENT_MAPPING: Record<SafetyReportType, Department> = {
    'Flight Operations Report': 'Flight Operations',
    'Ground Operations Report': 'Ground Operation',
    'Aircraft Defect Report': 'Maintenance',
    'Occupational Report': 'Management',
    'General Report': 'Management',
};

export type ExternalContact = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  description?: string;
};

export const VIEW_ALL_PAGES: Permission[] = [
  'Aircraft:View',
  'Students:View',
  'Personnel:View',
  'HireAndFly:View',
  'Safety:View',
  'Quality:View',
  'Checklists:View',
  'Alerts:View',
  'Reports:View',
  'Bookings:View',
];

export type CompanyPermission = {
    id: string;
    name: Permission;
    description?: string;
}

export type CompanyRole = {
    id: string;
    name: string;
    permissions: Permission[];
};

export type CompanyDepartment = {
    id: string;
    name: string;
};

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Super User': ['Super User'],
  'System Admin': ['Super User'],
  'Accountable Manager': [
    'Aircraft:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
    'Checklists:View',
    'Alerts:View',
    'Reports:View',
    'Bookings:View',
    'Settings:Edit',
  ],
  'Admin': [
    'Aircraft:Edit',
    'Students:Edit',
    'Personnel:Edit',
    'Safety:View',
    'Quality:View',
    'Checklists:Edit',
    'Alerts:Edit',
    'Reports:View',
    'Bookings:Edit',
    'Settings:Edit',
  ],
  'Operations Manager': [
    'Aircraft:View',
    'Bookings:Edit',
    'Personnel:View',
  ],
  'HR Manager': ['Personnel:View', 'Personnel:Edit', 'Students:View', 'HireAndFly:View'],
  'Safety Manager': ['Safety:View', 'Safety:Edit', 'Reports:View', 'Aircraft:View'],
  'Quality Manager': ['Quality:View', 'Quality:Edit', 'Reports:View', 'Aircraft:View'],
  'Aircraft Manager': ['Aircraft:View', 'Aircraft:Edit', 'Aircraft:UpdateHobbs'],
  'Maintenance': ['Aircraft:View', 'Aircraft:Edit', 'Checklists:View', 'Checklists:Edit'],
  'Chief Flight Instructor': [
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'HireAndFly:View',
    'Bookings:View',
    'Bookings:Edit',
    'Checklists:View',
    'Exams:Edit',
  ],
  'Head Of Training': [
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'HireAndFly:View',
    'Bookings:View',
    'Bookings:Edit',
    'Checklists:View',
    'Exams:Edit',
  ],
  'Instructor': ['Students:View', 'Bookings:View', 'Checklists:View', 'Exams:View'],
  'Student': ['Students:View', 'Bookings:View', 'Exams:View'],
  'Hire and Fly': ['Bookings:View'],
  'Auditee': ['Quality:View'],
  'Driver': [],
  'Front Office': ['Bookings:View', 'Bookings:Edit', 'Students:View', 'Personnel:View', 'HireAndFly:View']
};

export const ICAO_OCCURRENCE_CATEGORIES: string[] = [
    "ADRM", "AMAN", "ARC", "ATM", "BIRD", "CABIN", "CFIT", "CTOL", "EVAC", "EXTL",
    "F-NI", "F-POST", "FUEL", "GCOL", "GTOW", "ICE", "LALT", "LOC-G", "LOC-I",
    "LOLI", "MAC", "MED", "NAV", "OTHR", "RAMP", "RE", "RI", "SCF-NP", "SCF-PP",
    "SEC", "TURB", "UIMC", "UNK", "USOS", "WILD", "WSTRW"
];

export const ICAO_PHASES_OF_FLIGHT: string[] = [
    'Standing',
    'Pushback/Towing',
    'Taxi',
    'Take-off',
    'Initial Climb',
    'En-route',
    'Approach',
    'Landing',
    'Go-around',
    'Post-impact'
];

export const HIRE_AND_FLY_DOCUMENTS = [
  "Pilot License",
  "Medical Certificate",
  "Identification",
  "Passport",
] as const;

export type RiskLikelihood = 'Frequent' | 'Occasional' | 'Remote' | 'Improbable' | 'Extremely Improbable';
export type RiskSeverity = 'Catastrophic' | 'Hazardous' | 'Major' | 'Minor' | 'Negligible';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';
export type AuditArea = string;
export type FindingStatus = 'Compliant' | 'Non Compliant' | 'Partial' | 'Not Applicable' | 'Observation';
export type FindingLevel = 'Level 1 Finding' | 'Level 2 Finding' | 'Level 3 Finding' | 'Observation' | null;
export type ChecklistCategory = 'Pre-Flight' | 'Post-Flight' | 'Post-Maintenance';
export type ChecklistItemType = 'Checkbox' | 'Textbox' | 'StandardCamera' | 'AICamera-Registration' | 'AICamera-Hobbs' | 'Header';
export type AuditChecklistItem = { id: string; text: string; finding: FindingStatus | null; level: FindingLevel; observation?: string; findingNotes?: string; evidence?: string; regulationReference?: string; reference?: string; comment?: string; photo?: string; suggestedImprovement?: string; type?: ChecklistItemType; };


```