

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, CorrectiveAction, User } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { CorrectiveActionPlanForm } from './[auditId]/corrective-action-plan-form';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { Bot } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Alert } from '@/lib/types';

interface CapItem {
  auditId: string;
  auditNumber?: string;
  auditTitle: string;
  finding: NonConformanceIssue;
}

export function CapTracker({ audits, personnel, onUpdateAudit }: { audits: QualityAudit[], personnel: User[], onUpdateAudit: (updatedAudit: Partial<QualityAudit>) => void }) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [editingFinding, setEditingFinding] = React.useState<CapItem | null>(null);

  const allFindings = React.useMemo(() => {
    return audits
      .filter(audit => audit.status !== 'Archived')
      .flatMap(audit =>
        (audit.nonConformanceIssues || []).map(issue => ({
          auditId: audit.id,
          auditNumber: audit.auditNumber,
          auditTitle: audit.title,
          finding: issue,
        }))
      );
  }, [audits]);
  
  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Open': return 'warning';
      case 'In Progress': return 'primary';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  }
  
  const getOverdueVariant = (dueDate: string | undefined) => {
    if (!dueDate) return 'default';
    const days = differenceInDays(new Date(), parseISO(dueDate));
    if (days > 0) return 'destructive';
    if (days > -7) return 'warning';
    return 'default';
  }

  const getFindingLevelBadge = (finding: NonConformanceIssue): { variant: 'destructive' | 'warning' | 'orange' | 'secondary' | 'outline', text: string } => {
    if (finding.finding === 'Observation') {
        return { variant: 'secondary', text: 'OBS' };
    }
    switch (finding.level) {
        case 'Level 1 Finding': return { variant: 'warning', text: 'L1' };
        case 'Level 2 Finding': return { variant: 'orange', text: 'L2' };
        case 'Level 3 Finding': return { variant: 'destructive', text: 'L3' };
        default: return { variant: 'outline', text: 'N/A' };
    }
  }
  
  const handleCapSubmit = async (newPlan: CorrectiveActionPlan) => {
    if (!editingFinding || !company || !user) return;

    for (const action of newPlan.actions) {
        const responsibleUser = personnel.find(p => p.name === action.responsiblePerson);
        if (responsibleUser) {
            const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${editingFinding.auditNumber || editingFinding.auditId.substring(0,8)}`,
                description: `Action required for finding: "${editingFinding.finding.itemText}"`,
                author: user.name, 
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: responsibleUser.id,
                relatedLink: `/quality/${editingFinding.auditId}`,
            };
            const alertsCollection = collection(db, `companies/${company.id}/alerts`);
            await addDoc(alertsCollection, newAlert);
        }
    }
    toast({ title: 'Tasks Assigned', description: `Alerts have been sent to responsible personnel.`});
    

    const auditToUpdate = audits.find(a => a.id === editingFinding.auditId);
    if (!auditToUpdate) return;
    
    const existingPlans = editingFinding.finding.correctiveActionPlans || [];

    const updatedIssues = auditToUpdate.nonConformanceIssues.map(issue => 
        issue.id === editingFinding.finding.id 
        ? { ...issue, correctiveActionPlans: [...existingPlans, newPlan] } 
        : issue
    );

    onUpdateAudit({ id: auditToUpdate.id, nonConformanceIssues: updatedIssues });
    setEditingFinding(null);
    toast({
        title: 'Corrective Action Plan Saved',
        description: 'The CAP has been added to the finding.'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
        <CardDescription>
          A centralized view of all non-conformance findings and their corrective action plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Audit</TableHead>
                <TableHead>Finding &amp; Corrective Action Plan(s)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allFindings.length > 0 ? (
                allFindings.map(item => {
                    const caps = item.finding.correctiveActionPlans || [];
                    const levelBadge = getFindingLevelBadge(item.finding);
                    
                    return (
                        <TableRow key={`${item.auditId}-${item.finding.id}`}>
                            <TableCell>
                                <Link href={`/quality/${item.auditId}`} className="hover:underline text-primary">
                                    <div className="font-medium">{item.auditTitle}</div>
                                    <div className="text-xs text-muted-foreground">{item.auditNumber || item.auditId.substring(0,8) + '...'}</div>
                                </Link>
                            </TableCell>
                            <TableCell className="max-w-xl">
                                <div className="flex items-start gap-2">
                                    <Badge variant={levelBadge.variant}>{levelBadge.text}</Badge>
                                    <p className="font-semibold">{item.finding.itemText}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 pl-8">{item.finding.regulationReference}</p>
                                <Separator />
                                {caps.length > 0 ? (
                                    caps.map((cap, index) => (
                                        <div key={index} className="space-y-2 mt-2 text-xs border-l-2 pl-4 py-2">
                                            <div>
                                                <p className="font-medium text-muted-foreground">Root Cause</p>
                                                <p>{cap.rootCause}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-muted-foreground">Actions</p>
                                                <ul className="list-disc pl-5">
                                                  {cap.actions.map(action => (
                                                      <li key={action.id}>
                                                        {action.action} (
                                                        <span className="italic">{action.responsiblePerson}, due {format(parseISO(action.completionDate), 'dd MMM yyyy')}</span>
                                                      )
                                                      </li>
                                                  ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground italic">
                                        No corrective action plans yet.
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>
                                {caps.flatMap(cap => cap.actions).map(action => (
                                    <div key={action.id} className="mb-1">
                                        <Badge variant={getStatusVariant(action.status)}>{action.status}</Badge>
                                    </div>
                                ))}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="secondary" size="sm" onClick={() => setEditingFinding(item)}>
                                    <Edit className="mr-2 h-3 w-3" />
                                    {caps.length > 0 ? 'Edit/Add Plan' : 'Create CAP'}
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    No non-conformance findings or corrective action plans found.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
       <Dialog open={!!editingFinding} onOpenChange={() => setEditingFinding(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Corrective Action Plan for Finding</DialogTitle>
                    <DialogDescription asChild>
                        <div>
                            <div className="font-medium">{editingFinding?.finding.itemText}</div>
                            <div className="text-xs text-muted-foreground">{editingFinding?.finding.regulationReference}</div>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <div className="py-4 pr-6">
                        <CorrectiveActionPlanForm 
                            onSubmit={handleCapSubmit} 
                            personnel={personnel}
                            existingPlans={editingFinding?.finding.correctiveActionPlans}
                            onUpdatePlans={(updatedPlans) => {
                                if (!editingFinding) return;
                                const auditToUpdate = audits.find(a => a.id === editingFinding.auditId);
                                if (!auditToUpdate) return;
                                const updatedIssues = auditToUpdate.nonConformanceIssues.map(issue => 
                                    issue.id === editingFinding.finding.id ? { ...issue, correctiveActionPlans: updatedPlans } : issue
                                );
                                onUpdateAudit({ id: auditToUpdate.id, nonConformanceIssues: updatedIssues });
                            }}
                        />
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
