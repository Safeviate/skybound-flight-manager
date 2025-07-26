
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, Check, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, User, Alert } from '@/lib/types';
import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
import { generatePlanAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const initialState = {
  message: '',
  data: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Generate Corrective Action Plan
    </Button>
  );
}

function AnalysisResult({ data, onAccept }: { data: GenerateCorrectiveActionPlanOutput, onAccept: (plan: GenerateCorrectiveActionPlanOutput) => void }) {
  return (
    <div className="mt-4 space-y-4">
        <div>
            <h4 className="font-semibold text-sm">Summary of Findings</h4>
            <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{data.summaryOfFindings}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">Suggested Root Cause</h4>
            <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">{data.rootCause}</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">Proposed Corrective Actions</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Responsible</TableHead>
                        <TableHead>Deadline</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.correctiveActions.map((action, index) => (
                        <TableRow key={index}>
                            <TableCell>{action.action}</TableCell>
                            <TableCell>{action.responsiblePerson}</TableCell>
                            <TableCell>{format(parseISO(action.deadline), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        <div className="flex justify-end pt-4">
            <Button onClick={() => onAccept(data)}>
                <Check className="mr-2 h-4 w-4"/>
                Accept and Save Plan
            </Button>
        </div>
    </div>
  );
}

export function CorrectiveActionPlanGenerator({ 
    report, 
    personnel,
    onUpdate 
}: { 
    report: SafetyReport, 
    personnel: User[],
    onUpdate: (updatedReport: SafetyReport) => void; 
}) {
  const [state, formAction] = useActionState(generatePlanAction, initialState);
  const { toast } = useToast();
  const { company } = useUser();

  useEffect(() => {
    if (state.message && !state.message.includes('generated')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleAcceptPlan = async (plan: GenerateCorrectiveActionPlanOutput) => {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.'});
        return;
    }

    onUpdate({ ...report, correctiveActionPlan: plan });

    const alertsCollection = collection(db, `companies/${company.id}/alerts`);

    for (const action of plan.correctiveActions) {
        const responsibleUser = personnel.find(p => p.name === action.responsiblePerson);
        if (responsibleUser) {
            const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `CAP Assigned: ${report.reportNumber}`,
                description: action.action,
                author: 'System (Safety Dept.)',
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: responsibleUser.id,
                relatedLink: `/safety/${report.id}`,
            };

            await addDoc(alertsCollection, newAlert);
        }
    }
    
    toast({
        title: "Plan Saved & Notifications Sent",
        description: "The corrective action plan has been saved and responsible personnel have been notified."
    })
  };

  if (report.correctiveActionPlan) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Corrective Action Plan</CardTitle>
                <CardDescription>This is the official plan to address the findings of the investigation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div>
                    <h4 className="font-semibold text-sm">Summary of Findings</h4>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{report.correctiveActionPlan.summaryOfFindings}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm">Determined Root Cause</h4>
                    <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">{report.correctiveActionPlan.rootCause}</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-sm">Corrective Actions</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Responsible</TableHead>
                                <TableHead>Deadline</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.correctiveActionPlan.correctiveActions.map((action, index) => (
                                <TableRow key={index}>
                                    <TableCell className="max-w-xs">{action.action}</TableCell>
                                    <TableCell>{action.responsiblePerson}</TableCell>
                                    <TableCell>{format(parseISO(action.deadline), 'MMM d, yyyy')}</TableCell>
                                    <TableCell><Badge variant="outline">{action.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Corrective Action Plan Generator</CardTitle>
            <CardDescription>
              Use the AI assistant to generate a corrective action plan based on the full investigation.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <form action={formAction}>
                <input type="hidden" name="report" value={JSON.stringify(report)} />
                <SubmitButton />
            </form>
            {state.data && <AnalysisResult data={state.data as GenerateCorrectiveActionPlanOutput} onAccept={handleAcceptPlan} />}
        </CardContent>
    </Card>
  );
}
