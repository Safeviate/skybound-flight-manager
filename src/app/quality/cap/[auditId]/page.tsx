
'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, User, Alert } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { CorrectiveActionPlanForm } from './form';
import { addDoc } from 'firebase/firestore';

export default function CreateCapPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { company, user } = useUser();
  const { toast } = useToast();

  const auditId = params.auditId as string;
  const findingId = searchParams.get('findingId');

  const [audit, setAudit] = React.useState<QualityAudit | null>(null);
  const [finding, setFinding] = React.useState<NonConformanceIssue | null>(null);
  const [personnel, setPersonnel] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!company || !auditId || !findingId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const auditRef = doc(db, `companies/${company.id}/quality-audits`, auditId);
        const auditSnap = await getDoc(auditRef);

        if (auditSnap.exists()) {
          const auditData = auditSnap.data() as QualityAudit;
          setAudit(auditData);
          const currentFinding = auditData.nonConformanceIssues.find(f => f.id === findingId);
          if (currentFinding) {
            setFinding(currentFinding);
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Finding not found in this audit.' });
          }
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
  }, [company, auditId, findingId, toast]);

  const handleCapSubmit = async (newPlanData: Omit<CorrectiveActionPlan, 'id'>) => {
    if (!audit || !finding || !company || !user) return;

    // Send notifications for new actions
    for (const action of newPlanData.actions) {
        const responsibleUser = personnel.find(p => p.name === action.responsiblePerson);
        if (responsibleUser) {
            const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${audit.auditNumber || audit.id.substring(0,8)}`,
                description: `Action required for finding: "${finding.itemText}"`,
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

    const newPlan: CorrectiveActionPlan = {
      id: `cap-${Date.now()}`,
      ...newPlanData,
    };
    
    const updatedPlans = [...(finding.correctiveActionPlans || []), newPlan];

    const updatedIssues = audit.nonConformanceIssues.map(issue => 
        issue.id === finding.id 
        ? { ...issue, correctiveActionPlans: updatedPlans } 
        : issue
    );

    const auditRef = doc(db, `companies/${company.id}/quality-audits`, audit.id);
    try {
        await updateDoc(auditRef, { nonConformanceIssues: updatedIssues });
        toast({ title: 'Corrective Action Plan Saved' });
        router.push('/quality?tab=cap-tracker');
    } catch(e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save CAP.' });
    }
  };

  if (loading) {
    return <main className="flex-1 p-4 md:p-8"><p>Loading...</p></main>;
  }

  if (!audit || !finding) {
    return <main className="flex-1 p-4 md:p-8"><p>Could not load audit or finding details.</p></main>;
  }

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
            <CardTitle>Create Corrective Action Plan</CardTitle>
            <CardDescription>
              For finding: <span className="font-semibold">{finding.itemText}</span>
              <br />
              From audit: <span className="font-semibold">{audit.title} ({audit.auditNumber})</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CorrectiveActionPlanForm
              onSubmit={handleCapSubmit}
              personnel={personnel}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

CreateCapPage.title = 'Create Corrective Action Plan';
