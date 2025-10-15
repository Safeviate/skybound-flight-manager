

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, User } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { CorrectiveActionPlanForm } from './[auditId]/corrective-action-plan-form';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { QualityAuditAnalyzer } from './quality-audit-analyzer';
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
  const [suggestedCap, setSuggestedCap] = React.useState<GenerateQualityCapOutput | null>(null);

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
  
  const handleCapSubmit = async (data: CorrectiveActionPlan) => {
    if (!editingFinding || !company || !user) return;

    const responsibleUser = personnel.find(p => p.name === data.responsiblePerson);
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
        toast({ title: 'Task Assigned', description: `An alert has been sent to ${responsibleUser.name}.`});
    }

    const auditToUpdate = audits.find(a => a.id === editingFinding.auditId);
    if (!auditToUpdate) return;
    
    const updatedIssues = auditToUpdate.nonConformanceIssues.map(issue => 
        issue.id === editingFinding.finding.id ? { ...issue, correctiveActionPlan: data } : issue
    );

    onUpdateAudit({ id: auditToUpdate.id, nonConformanceIssues: updatedIssues });
    setEditingFinding(null);
    setSuggestedCap(null);
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
                <TableHead>Finding &amp; Corrective Action Plan</TableHead>
                <TableHead>Responsible Person</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allFindings.length > 0 ? (
                allFindings.map(item => {
                    const cap = item.finding.correctiveActionPlan;
                    const isOverdue = cap && cap.status !== 'Closed' && differenceInDays(new Date(), parseISO(cap.completionDate)) > 0;
                    const levelBadge = getFindingLevelBadge(item.finding);
                    
                    return (
                        <TableRow key={`${item.auditId}-${item.finding.id}`}>
                            <TableCell>
                                <Link href={`/quality/${item.auditId}`} className="hover:underline text-primary">
                                    <div className="font-medium">{item.auditTitle}</div>
                                    <div className="text-xs text-muted-foreground">{item.auditNumber || item.auditId.substring(0,8) + '...'}</div>
                                </Link>
                            </TableCell>
                            <TableCell className="max-w-sm">
                                <div className="flex items-start gap-2">
                                    <Badge variant={levelBadge.variant}>{levelBadge.text}</Badge>
                                    <p className="font-semibold">{item.finding.itemText}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 pl-8">{item.finding.regulationReference}</p>
                                <Separator />
                                {cap ? (
                                    <div className="space-y-2 mt-2 text-xs">
                                        <div>
                                            <p className="font-medium text-muted-foreground">Root Cause</p>
                                            <p>{cap.rootCause}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-muted-foreground">Corrective Action</p>
                                            <p>{cap.correctiveAction}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-muted-foreground">Preventative Action</p>
                                            <p>{cap.preventativeAction}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-muted-foreground italic">
                                        Corrective action plan pending.
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>{cap?.responsiblePerson || 'N/A'}</TableCell>
                            <TableCell>
                                {cap ? (
                                    <Badge variant={getOverdueVariant(cap.completionDate)}>
                                        {isOverdue && <Clock className="mr-1 h-3 w-3" />}
                                        {format(parseISO(cap.completionDate), 'MMM d, yyyy')}
                                    </Badge>
                                ) : 'N/A'}
                            </TableCell>
                            <TableCell>
                                {cap ? (
                                    <Badge variant={getStatusVariant(cap.status)}>{cap.status}</Badge>
                                ) : (
                                    <Button variant="secondary" size="sm" onClick={() => setEditingFinding(item)}>
                                        <Edit className="mr-2 h-3 w-3" />
                                        Create CAP
                                    </Button>
                                )}
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
       <Dialog open={!!editingFinding} onOpenChange={() => { setEditingFinding(null); setSuggestedCap(null); }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Corrective Action Plan for Finding</DialogTitle>
                    <DialogDescription>
                        <p className="font-medium">{editingFinding?.finding.itemText}</p>
                        <p className="text-xs text-muted-foreground">{editingFinding?.finding.regulationReference}</p>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <CorrectiveActionPlanForm 
                            onSubmit={handleCapSubmit} 
                            suggestedCap={suggestedCap}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-4 p-4 border-t">
                        <h3 className="font-semibold flex items-center gap-2"><Bot /> AI Assistant</h3>
                        <QualityAuditAnalyzer 
                            auditText={`Non-Conformance: ${editingFinding?.finding.itemText}\nLevel: ${editingFinding?.finding.level}\nRegulation: ${editingFinding?.finding.regulationReference}\n\nAuditor Comment:\n${editingFinding?.finding.comment}`}
                            onCapSuggested={(cap) => setSuggestedCap(cap)}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
