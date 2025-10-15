
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, User, Alert } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { CorrectiveActionPlanForm } from './form';
import { addDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';

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
        
        // Fetch personnel
        const personnelQuery = collection(db, `companies/${company.id}/users`);
        const personnelSnapshot = await getDocs(personnelQuery);
        setPersonnel(personnelSnapshot.docs.map(doc => doc.data() as User));

      } catch (error) {
        console.error("Error fetching data for CAP page:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load required data.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company, auditId, toast]);

  const handleCapSubmit = async (newPlanData: Omit<CorrectiveActionPlan, 'id'>) => {
    if (!audit || !editingFinding || !company || !user) return;

    // Send notifications for new actions
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
        // Update existing plan
        updatedPlans = (editingFinding.correctiveActionPlans || []).map(p =>
            p.id === editingPlan.id ? { ...p, ...newPlanData } : p
        );
    } else {
        // Add new plan
        const newPlan: CorrectiveActionPlan = {
          id: `cap-${Date.now()}`,
          ...newPlanData,
        };
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
        setEditingFinding(null); // Close dialog on success
        setEditingPlan(null);
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save CAP.' });
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
                                     <div className="mt-4 space-y-2">
                                        <h4 className="font-semibold text-sm">Existing Corrective Action Plans:</h4>
                                        {finding.correctiveActionPlans.map(plan => (
                                            <div key={plan.id} className="p-3 border rounded-lg bg-background">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-medium text-destructive">Root Cause: <span className="font-normal text-foreground">{plan.rootCause}</span></p>
                                                </div>
                                                <Separator className="my-2" />
                                                <ul className="space-y-1">
                                                    {plan.actions.map(action => (
                                                        <li key={action.id} className="text-xs text-muted-foreground">
                                                            <span className="font-semibold text-foreground mr-2">{action.isPreventative ? 'Preventative:' : 'Corrective:'}</span>
                                                            {action.action}
                                                            <span className="font-medium text-foreground ml-2">({action.responsiblePerson} - Due: {format(parseISO(action.completionDate), 'PPP')})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button size="sm" onClick={() => { setEditingFinding(finding); setEditingPlan(null); }}>
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
       <Dialog open={!!editingFinding} onOpenChange={() => setEditingFinding(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Corrective Action Plan</DialogTitle>
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
    </main>
  );
}

CreateCapPage.title = 'Create Corrective Action Plan';
