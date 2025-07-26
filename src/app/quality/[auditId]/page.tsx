

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { QualityAudit, NonConformanceIssue, FindingStatus, FindingLevel, CorrectiveActionPlan, User, Alert } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ListChecks, MessageSquareWarning, Microscope, Ban, MinusCircle, XCircle, User as UserIcon, ShieldCheck, Calendar, BookOpen, UserCheck, Target, Percent, FileText, ArrowLeft, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/user-provider';
import { doc, getDoc, updateDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CorrectiveActionPlanForm } from './corrective-action-plan-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function QualityAuditDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, company, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const auditId = params.auditId as string;
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
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
        const q = collection(db, `companies/${company!.id}/users`);
        const snapshot = await getDocs(q);
        setPersonnel(snapshot.docs.map(doc => ({...doc.data(), id: doc.id } as User)));
    };

    fetchAudit();
    fetchPersonnel();
  }, [auditId, user, company, userLoading, router, toast]);
  
  const updateAuditInFirestore = async (updatedAudit: QualityAudit) => {
    if (!company) return;
    const { id, ...auditData } = updatedAudit;
    try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, id);
        await updateDoc(auditRef, { 
            nonConformanceIssues: auditData.nonConformanceIssues,
        });
        setAudit(updatedAudit);
    } catch (error) {
        console.error("Error updating audit:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes.' });
    }
  };

  const handleCapSubmit = async (issueId: string, cap: CorrectiveActionPlan) => {
    if (!audit || !company || !user) return;
    
    const responsiblePerson = personnel.find(p => p.name === cap.responsiblePerson);
    if (!responsiblePerson) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the assigned user.' });
        return;
    }

    const updatedIssues = audit.nonConformanceIssues.map(issue => 
      issue.id === issueId ? { ...issue, correctiveActionPlan: cap } : issue
    );

    const updatedAudit = { ...audit, nonConformanceIssues: updatedIssues };
    
    // Create a targeted alert for the responsible person
    const alertData: Omit<Alert, 'id'> = {
        companyId: company.id,
        number: Date.now(),
        type: 'Task',
        title: `CAP Assigned: Audit ${auditId.substring(0, 6)}...`,
        description: `You have been assigned a corrective action: "${cap.correctiveAction}"`,
        author: user.name,
        date: format(new Date(), 'yyyy-MM-dd'),
        readBy: [],
        targetUserId: responsiblePerson.id,
        relatedLink: `/quality/${auditId}`
    };
    await addDoc(collection(db, `companies/${company.id}/alerts`), alertData);
    
    await updateAuditInFirestore(updatedAudit);

    setEditingIssueId(null);
    toast({ title: 'Success', description: `Corrective Action Plan saved and notification sent to ${responsiblePerson.name}.` });
  };
  
  const handleCapStatusChange = async (issueId: string, newStatus: CorrectiveActionPlan['status']) => {
    if (!audit || !company) return;
    const updatedIssues = audit.nonConformanceIssues.map(issue => {
        if (issue.id === issueId && issue.correctiveActionPlan) {
            return {
                ...issue,
                correctiveActionPlan: { ...issue.correctiveActionPlan, status: newStatus }
            };
        }
        return issue;
    });

    const updatedAudit = { ...audit, nonConformanceIssues: updatedIssues };
     try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        // We only update the single field to avoid race conditions with other parts of the object
        await updateDoc(auditRef, { nonConformanceIssues: updatedIssues });
        setAudit(updatedAudit);
        toast({ title: 'Status Updated', description: `CAP status changed to "${newStatus}".`});
    } catch (error) {
        console.error("Error updating CAP status:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save status change.' });
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

  const getFindingInfo = (finding: FindingStatus | null) => {
    switch (finding) {
        case 'Compliant': return { icon: <CheckCircle className="h-5 w-5 text-green-600" />, variant: 'success' as const, text: 'Compliant' };
        case 'Partial': return { icon: <MinusCircle className="h-5 w-5 text-yellow-600" />, variant: 'warning' as const, text: 'Partial Compliance' };
        case 'Non-compliant': return { icon: <XCircle className="h-5 w-5 text-red-600" />, variant: 'destructive' as const, text: 'Non-compliant' };
        case 'Observation': return { icon: <MessageSquareWarning className="h-5 w-5 text-blue-600" />, variant: 'secondary' as const, text: 'Observation' };
        case 'Not Applicable': return { icon: <FileText className="h-5 w-5 text-gray-500" />, variant: 'outline' as const, text: 'N/A' };
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

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Audit Report</h2>
            <Button asChild variant="outline">
                <Link href="/quality?tab=audits">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Audits
                </Link>
            </Button>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">Quality Audit Report: {audit.id}</CardTitle>
                <CardDescription>
                  Detailed report for the {audit.type} audit conducted on {format(parseISO(audit.date), 'MMMM d, yyyy')}.
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <Badge variant="outline" className="text-base flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  {audit.complianceScore}% Compliant
                </Badge>
              </div>
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
                <p>{audit.auditeeName} ({audit.auditeePosition})</p>
              </div>
            </div>
            <div className="space-y-2 border-t pt-6">
                <h3 className="font-semibold">Audit Summary</h3>
                <p className="text-muted-foreground p-3 bg-muted rounded-md">{audit.summary}</p>
            </div>
          </CardContent>
        </Card>

        {audit.nonConformanceIssues.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Audit Findings & Corrective Actions
                    </CardTitle>
                    <CardDescription>
                        The following issues, observations, and corrective action plans were identified during the audit.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {audit.nonConformanceIssues.map((issue, index) => {
                                const levelInfo = getLevelInfo(issue.level);
                                const cap = issue.correctiveActionPlan;
                                return (
                                    <div key={issue.id} className="p-4 border rounded-lg">
                                        <div className="flex items-start gap-3">
                                            {levelInfo ? levelInfo.icon : <MessageSquareWarning className="h-5 w-5 text-blue-600" />}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-base flex items-center gap-2">Finding #{index + 1}: 
                                                        {levelInfo && <Badge variant={levelInfo.variant}>{issue.level}</Badge>}
                                                    </h4>
                                                    <Badge variant="outline">{issue.category}</Badge>
                                                </div>
                                                <p className="text-muted-foreground mt-1">{issue.description}</p>
                                                <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">Regulation:</span> {issue.regulationReference || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {cap ? (
                                            <div className="mt-4 pt-4 border-t space-y-4">
                                                <h5 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/> Corrective Action Plan</h5>
                                                <div className="space-y-2 text-sm p-3 bg-muted rounded-md">
                                                    <p><span className="font-semibold">Root Cause:</span> {cap.rootCause}</p>
                                                    <p><span className="font-semibold">Corrective Action:</span> {cap.correctiveAction}</p>
                                                    <p><span className="font-semibold">Preventative Action:</span> {cap.preventativeAction}</p>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4 text-sm">
                                                    <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground"/> <span>{cap.responsiblePerson}</span></div>
                                                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/> <span>Due: {format(parseISO(cap.completionDate), 'MMM d, yyyy')}</span></div>
                                                    <div className="flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-muted-foreground"/> 
                                                         <Select value={cap.status} onValueChange={(newStatus: CorrectiveActionPlan['status']) => handleCapStatusChange(issue.id, newStatus)}>
                                                            <SelectTrigger className="w-[150px] h-8">
                                                                <SelectValue placeholder="Set status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Open">Open</SelectItem>
                                                                <SelectItem value="In Progress">In Progress</SelectItem>
                                                                <SelectItem value="Closed">Closed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 pt-4 border-t flex justify-end">
                                                <Dialog open={editingIssueId === issue.id} onOpenChange={(open) => !open && setEditingIssueId(null)}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" onClick={() => setEditingIssueId(issue.id)}>
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Add Corrective Action Plan
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Create Corrective Action Plan</DialogTitle>
                                                            <DialogDescription>
                                                                Define the plan to address Finding #{index + 1}.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <CorrectiveActionPlanForm onSubmit={(cap) => handleCapSubmit(issue.id, cap)} />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                </CardContent>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary"/>
                    Full Audit Checklist
                </CardTitle>
                <CardDescription>A complete record of all items checked during the audit.</CardDescription>
            </CardHeader>
            <CardContent>
                {audit.checklistItems && audit.checklistItems.length > 0 ? (
                    <div className="space-y-3">
                        {audit.checklistItems.map(item => {
                            const findingInfo = getFindingInfo(item.finding);
                            const levelInfo = getLevelInfo(item.level);
                            const hasDetails = item.observation || item.evidence || (item.regulationReference && item.regulationReference !== 'N/A');
                            return (
                                <div key={item.id} className="p-3 border rounded-md bg-muted/30">
                                    <div className="flex items-start justify-between">
                                        <p className="flex-1 pr-8">{item.text}</p>
                                        <div className="flex items-center gap-2">
                                            {levelInfo && <Badge variant={levelInfo.variant}>{item.level}</Badge>}
                                            <Badge variant={findingInfo.variant} className="whitespace-nowrap">
                                                {findingInfo.text}
                                            </Badge>
                                        </div>
                                    </div>
                                    {hasDetails && (
                                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                                            {item.observation && <p><span className="font-semibold">Observation:</span> {item.observation}</p>}
                                            {item.evidence && <p><span className="font-semibold">Evidence:</span> {item.evidence}</p>}
                                            {item.regulationReference && item.regulationReference !== 'N/A' && <p><span className="font-semibold">Regulation:</span> {item.regulationReference}</p>}
                                        </div>
                                    )}
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
        </Card>
      </main>
  );
}
