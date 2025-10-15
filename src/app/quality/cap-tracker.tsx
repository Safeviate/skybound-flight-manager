

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { CorrectiveActionPlanForm } from './[auditId]/corrective-action-plan-form';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { Bot } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Alert } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CapItem {
  auditId: string;
  auditNumber?: string;
  auditTitle: string;
  finding: NonConformanceIssue;
}

export function CapTracker({ audits, personnel, onUpdateAudit }: { audits: QualityAudit[], personnel: User[], onUpdateAudit: (updatedAudit: Partial<QualityAudit>) => void }) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [viewingFinding, setViewingFinding] = React.useState<CapItem | null>(null);
  const [editingPlan, setEditingPlan] = React.useState<CorrectiveActionPlan | null>(null);
  const [isAddPlanOpen, setIsAddPlanOpen] = React.useState(false);

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
  
  const handleCapSubmit = async (newPlanData: Omit<CorrectiveActionPlan, 'id'>) => {
    if (!viewingFinding || !company || !user) return;

    for (const action of newPlanData.actions) {
        const responsibleUser = personnel.find(p => p.name === action.responsiblePerson);
        if (responsibleUser) {
            const newAlert: Omit<Alert, 'id' | 'number'> = {
                companyId: company.id,
                type: 'Task',
                title: `Audit CAP Assigned: ${viewingFinding.auditNumber || viewingFinding.auditId.substring(0,8)}`,
                description: `Action required for finding: "${viewingFinding.finding.itemText}"`,
                author: user.name, 
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: responsibleUser.id,
                relatedLink: `/quality/${viewingFinding.auditId}`,
            };
            const alertsCollection = collection(db, `companies/${company.id}/alerts`);
            await addDoc(alertsCollection, newAlert);
        }
    }
    
    const auditToUpdate = audits.find(a => a.id === viewingFinding.auditId);
    if (!auditToUpdate) return;
    
    let updatedPlans: CorrectiveActionPlan[];

    if (editingPlan) {
        // Update existing plan
        updatedPlans = (viewingFinding.finding.correctiveActionPlans || []).map(p =>
            p.id === editingPlan.id ? { ...p, ...newPlanData } : p
        );
    } else {
        // Add new plan
        const newPlan: CorrectiveActionPlan = {
            id: `cap-${Date.now()}`,
            ...newPlanData,
        };
        updatedPlans = [...(viewingFinding.finding.correctiveActionPlans || []), newPlan];
    }
    
    const updatedIssues = auditToUpdate.nonConformanceIssues.map(issue => 
        issue.id === viewingFinding.finding.id 
        ? { ...issue, correctiveActionPlans: updatedPlans } 
        : issue
    );

    onUpdateAudit({ id: auditToUpdate.id, nonConformanceIssues: updatedIssues });
    setViewingFinding(prev => prev ? { ...prev, finding: { ...prev.finding, correctiveActionPlans: updatedPlans } } : null);
    
    setIsAddPlanOpen(false);
    setEditingPlan(null);
    toast({
        title: `Corrective Action Plan ${editingPlan ? 'Updated' : 'Saved'}`,
    });
  }

  const handlePlanDelete = (planId: string) => {
    if (!viewingFinding) return;

    const auditToUpdate = audits.find(a => a.id === viewingFinding.auditId);
    if (!auditToUpdate) return;
    
    const updatedPlans = (viewingFinding.finding.correctiveActionPlans || []).filter(p => p.id !== planId);
    
    const updatedIssues = auditToUpdate.nonConformanceIssues.map(issue => 
        issue.id === viewingFinding.finding.id 
        ? { ...issue, correctiveActionPlans: updatedPlans } 
        : issue
    );

    onUpdateAudit({ id: auditToUpdate.id, nonConformanceIssues: updatedIssues });
    setViewingFinding(prev => prev ? { ...prev, finding: { ...prev.finding, correctiveActionPlans: updatedPlans } } : null);

    toast({
        title: 'Corrective Action Plan Deleted',
    });
  }

  const handleOpenEditPlan = (plan: CorrectiveActionPlan) => {
    setEditingPlan(plan);
    setIsAddPlanOpen(true);
  }

  return (
    <>
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
                            </TableCell>
                            <TableCell>
                                {caps.flatMap(cap => cap.actions).map(action => (
                                    <div key={action.id} className="mb-1">
                                        <Badge variant={getStatusVariant(action.status)}>{action.status}</Badge>
                                    </div>
                                ))}
                                {caps.length === 0 && <Badge variant="outline">No Plan</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="secondary" size="sm" onClick={() => setViewingFinding(item)}>
                                    <Edit className="mr-2 h-3 w-3" />
                                    {caps.length > 0 ? 'Manage Plans' : 'Create Plan'}
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
    </Card>
    
    {/* Main Dialog for Viewing/Managing Plans */}
    <Dialog open={!!viewingFinding} onOpenChange={() => setViewingFinding(null)}>
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Corrective Action Plans for Finding</DialogTitle>
                <DialogDescription>
                    <div className="font-medium">{viewingFinding?.finding.itemText}</div>
                    <div className="text-xs text-muted-foreground">{viewingFinding?.finding.regulationReference}</div>
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-6">
                <div className="py-4 space-y-4">
                    {(viewingFinding?.finding.correctiveActionPlans || []).map((plan, index) => (
                        <Accordion type="single" collapsible key={plan.id} defaultValue="item-0">
                           <AccordionItem value={`item-${index}`}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <span>Root Cause {index + 1}: {plan.rootCause}</span>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenEditPlan(plan); }}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handlePlanDelete(plan.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-2">
                                    <ul className="list-disc pl-5 text-sm space-y-2 mt-2">
                                        {plan.actions.map(action => (
                                            <li key={action.id}>
                                                {action.action}
                                                <div className="text-xs text-muted-foreground">
                                                    {action.responsiblePerson} - Due: {format(parseISO(action.completionDate), 'PPP')} - <Badge variant={getStatusVariant(action.status)} className="h-auto py-0 px-1.5">{action.status}</Badge>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    ))}
                    {(viewingFinding?.finding.correctiveActionPlans?.length || 0) === 0 && (
                        <p className="text-sm text-center text-muted-foreground py-4">No plans have been created for this finding yet.</p>
                    )}
                </div>
            </ScrollArea>
             <DialogFooter>
                <Button variant="outline" onClick={() => { setEditingPlan(null); setIsAddPlanOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New Corrective Action Plan
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    {/* Nested Dialog for Adding/Editing a Plan */}
     <Dialog open={isAddPlanOpen} onOpenChange={setIsAddPlanOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>{editingPlan ? 'Edit' : 'Create'} Corrective Action Plan</DialogTitle>
                 <DialogDescription>
                    Define a root cause and the actions needed to address it.
                </DialogDescription>
            </DialogHeader>
             <ScrollArea className="h-[70vh] pr-4">
                <CorrectiveActionPlanForm 
                    onSubmit={handleCapSubmit} 
                    personnel={personnel}
                    existingPlan={editingPlan}
                />
            </ScrollArea>
        </DialogContent>
    </Dialog>
    </>
  );
}
