'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, getDocs, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, User, Alert } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, CheckCircle2, MessageSquare, Save, XCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { CorrectiveActionPlanForm } from './form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function CreateCapPage() {
  const params = useParams();
  const router = useRouter();
  const { company, user } = useUser();
  const { toast } = useToast();

  const auditId = params.auditId as string;

  const [audit, setAudit] = React.useState<QualityAudit | null>(null);
  const [personnel, setPersonnel] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingFinding, setEditingFinding] = React.useState<NonConformanceIssue | null>(null);
  const [editingPlan, setEditingPlan] = React.useState<CorrectiveActionPlan | null>(null);
  
  // Closure State
  const [isClosureDialogOpen, setIsClosureDialogOpen] = React.useState(false);
  const [planToClose, setPlanToClose] = React.useState<{ findingId: string, planId: string } | null>(null);
  const [closureNotes, setClosureNotes] = React.useState('');

  React.useEffect(() => {
    if (!company || !auditId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        const auditSnap = await getDoc(auditRef);

        if (auditSnap.exists()) {
          const auditData = auditSnap.data() as QualityAudit;
          setAudit(auditData);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Audit not found.' });
        }
        
        const personnelQuery = collection(db, `companies/${company.id}/users`);
        const personnelSnapshot = await getDocs(personnelQuery);
        setPersonnel(personnelSnapshot.docs.map(doc => ({...doc.data(), id: doc.id } as User)));

      } catch (error) {
        console.error("Error fetching data for CAP page:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load required data.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company, auditId, toast]);

  const handleCapSubmit = async (newPlanData: Omit<CorrectiveActionPlan, 'id' | 'status'>) => {
    if (!audit || !editingFinding || !company || !user) return;

    for (const action of newPlanData.actions) {
        const responsibleUser = personnel.find(p => p.name === action.responsiblePerson);
        if (responsibleUser) {
            const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${audit.auditNumber || audit.id.substring(0,8)}`,
                description: `Action required for finding: "${editingFinding.itemText}"`,
                author: user.name, 
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: responsibleUser.id,
                relatedLink: `/quality/${audit.id}`,
            };
            const alertsCollection = collection(db, `companies/${company.id}/alerts`);
            await addDoc(alertsCollection, newAlert);
        }
    }
    
    let updatedPlans: CorrectiveActionPlan[];

    if (editingPlan) {
        updatedPlans = (editingFinding.correctiveActionPlans || []).map(p =>
            p.id === editingPlan.id ? { ...p, ...newPlanData } as CorrectiveActionPlan : p
        );
    } else {
        const newPlan: CorrectiveActionPlan = {
          id: `cap-${Date.now()}`,
          ...newPlanData,
          status: 'Open',
        } as CorrectiveActionPlan;
        updatedPlans = [...(editingFinding.correctiveActionPlans || []), newPlan];
    }
    
    const updatedIssues = audit.nonConformanceIssues.map(issue => 
        issue.id === editingFinding.id 
        ? { ...issue, correctiveActionPlans: updatedPlans } 
        : issue
    );

    const auditRef = doc(db, `companies/${company.id}/quality-audits`, audit.id);
    try {
        await updateDoc(auditRef, { nonConformanceIssues: updatedIssues });
        setAudit(prev => prev ? { ...prev, nonConformanceIssues: updatedIssues } : null);
        toast({ title: `Corrective Action Plan ${editingPlan ? 'Updated' : 'Saved'}` });
        setEditingFinding(null);
        setEditingPlan(null);
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save CAP.' });
    }
  };

  const handleClosePlan = async () => {
    if (!audit || !planToClose || !company || !user) return;

    const { findingId, planId } = planToClose;

    const updatedIssues = audit.nonConformanceIssues.map(issue => {
        if (issue.id === findingId) {
            const updatedPlans = (issue.correctiveActionPlans || []).map(plan => {
                if (plan.id === planId) {
                    return {
                        ...plan,
                        status: 'Closed' as const,
                        closureNotes: closureNotes,
                        closedDate: new Date().toISOString(),
                        closedBy: user.name,
                    };
                }
                return plan;
            });
            return { ...issue, correctiveActionPlans: updatedPlans };
        }
        return issue;
    });

    const auditRef = doc(db, `companies/${company.id}/quality-audits`, audit.id);
    try {
        await updateDoc(auditRef, { nonConformanceIssues: updatedIssues });
        setAudit(prev => prev ? { ...prev, nonConformanceIssues: updatedIssues } : null);
        toast({ title: 'Corrective Action Plan Closed' });
        setIsClosureDialogOpen(false);
        setPlanToClose(null);
        setClosureNotes('');
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to close CAP.' });
    }
  };

  if (loading) {
    return <main className="flex-1 p-4 md:p-8"><p>Loading...</p></main>;
  }

  if (!audit) {
    return <main className="flex-1 p-4 md:p-8"><p>Could not load audit details.</p></main>;
  }
  
  const nonConformanceIssues = audit.nonConformanceIssues || [];

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" asChild>
          <Link href="/quality?tab=cap-tracker">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CAP Tracker
          </Link>
        </Button>
        <Card>
            <CardHeader>
                <CardTitle>Corrective Action Plans for Audit {audit.auditNumber}</CardTitle>
                <CardDescription>
                    Address all non-conformance findings identified during this audit.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {nonConformanceIssues.length > 0 ? (
                    nonConformanceIssues.map(finding => (
                         <Card key={finding.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{finding.itemText}</CardTitle>
                                        <CardDescription className="text-xs">{finding.regulationReference}</CardDescription>
                                    </div>
                                    <Badge variant={finding.level === 'Level 3 Finding' ? 'destructive' : 'warning'}>{finding.level}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="p-3 border rounded-md bg-muted/50">
                                    <h4 className="font-semibold text-sm">Auditor Comment</h4>
                                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{finding.comment || 'No comment provided.'}</p>
                                </div>
                                {finding.correctiveActionPlans && finding.correctiveActionPlans.length > 0 && (
                                     <div className="mt-4 space-y-4">
                                        <h4 className="font-semibold text-sm">Existing Corrective Action Plans:</h4>
                                        {finding.correctiveActionPlans.map(plan => (
                                            <div key={plan.id} className="p-4 border rounded-lg bg-background space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-destructive">Root Cause: <span className="font-normal text-foreground">{plan.rootCause}</span></p>
                                                    </div>
                                                    <Badge variant={plan.status === 'Closed' ? 'success' : 'outline'}>
                                                        {plan.status || 'Open'}
                                                    </Badge>
                                                </div>
                                                <Separator />
                                                <ul className="space-y-2">
                                                    {plan.actions.map(action => (
                                                        <li key={action.id} className="text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn("font-semibold text-foreground px-1.5 py-0.5 rounded-sm", action.isPreventative ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800")}>
                                                                    {action.isPreventative ? 'Preventative' : 'Corrective'}
                                                                </span>
                                                                <span className="text-foreground">{action.action}</span>
                                                            </div>
                                                            <div className="mt-1 ml-2">
                                                                <span className="font-medium text-foreground">{action.responsiblePerson}</span>
                                                                <span className="mx-1">|</span>
                                                                <span>Due: {format(parseISO(action.completionDate), 'PPP')}</span>
                                                                <span className="mx-1">|</span>
                                                                <Badge variant={action.status === 'Closed' ? 'success' : 'warning'} className="text-[10px] h-4 px-1">{action.status}</Badge>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {plan.status === 'Closed' && plan.closureNotes && (
                                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
                                                        <p className="font-semibold text-green-800 flex items-center gap-2">
                                                            <CheckCircle2 className="h-4 w-4" /> Closure Statement
                                                        </p>
                                                        <p className="mt-1 text-green-700 whitespace-pre-wrap">{plan.closureNotes}</p>
                                                        <p className="mt-2 text-[10px] text-green-600 italic">Closed by {plan.closedBy} on {format(parseISO(plan.closedDate!), 'PPP p')}</p>
                                                    </div>
                                                )}
                                                {plan.status !== 'Closed' && (
                                                    <div className="flex justify-end gap-2 pt-2">
                                                        <Button variant="outline" size="sm" onClick={() => { setEditingFinding(finding); setEditingPlan(plan); }}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Plan
                                                        </Button>
                                                        <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => { setPlanToClose({ findingId: finding.id, planId: plan.id }); setIsClosureDialogOpen(true); }}>
                                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Close Plan
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" variant="outline" onClick={() => { setEditingFinding(finding); setEditingPlan(null); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Another CAP
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No non-conformances were recorded for this audit.</p>
                    </div>
                )}
            </CardContent>
        </Card>

      </div>
       <Dialog open={!!editingFinding} onOpenChange={() => { setEditingFinding(null); setEditingPlan(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Corrective Action Plan</DialogTitle>
            <DialogDescription>
                Define the root cause and the specific corrective and preventative actions for the finding: "{editingFinding?.itemText}"
            </DialogDescription>
          </DialogHeader>
          <CorrectiveActionPlanForm
              onSubmit={handleCapSubmit}
              personnel={personnel}
              existingPlan={editingPlan}
            />
        </DialogContent>
      </Dialog>

      <Dialog open={isClosureDialogOpen} onOpenChange={setIsClosureDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Close Corrective Action Plan</DialogTitle>
                  <DialogDescription>
                      Provide a final closure statement summarizing why this plan is now complete.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="closure-notes">Closure Statement / Evidence</Label>
                      <Textarea 
                        id="closure-notes"
                        placeholder="e.g., All actions verified. New procedure SOP-04 implemented and staff trained..."
                        value={closureNotes}
                        onChange={(e) => setClosureNotes(e.target.value)}
                        className="min-h-[120px]"
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsClosureDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleClosePlan} disabled={!closureNotes.trim()}>Finalize Closure</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </main>
  );
}
