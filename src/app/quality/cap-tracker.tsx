
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { Bot } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Alert } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useRouter } from 'next/navigation';
import { CorrectiveActionPlanForm } from './cap/[auditId]/form';


interface CapItem {
  auditId: string;
  auditNumber?: string;
  auditTitle: string;
  findings: NonConformanceIssue[];
}

export function CapTracker({ audits, personnel, onUpdateAudit }: { audits: QualityAudit[], personnel: User[], onUpdateAudit: (updatedAudit: Partial<QualityAudit>) => void }) {
  const router = useRouter();

  const groupedFindings = React.useMemo(() => {
    const auditsWithFindings = audits.filter(
      audit => audit.status !== 'Archived' && audit.nonConformanceIssues && audit.nonConformanceIssues.length > 0
    );

    return auditsWithFindings.map(audit => ({
      auditId: audit.id,
      auditNumber: audit.auditNumber,
      auditTitle: audit.title,
      findings: audit.nonConformanceIssues,
    }));
  }, [audits]);
  
  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Open': return 'warning';
      case 'In Progress': return 'primary';
      case 'Closed': return 'success';
      default: return 'outline';
    }
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

  const handleManagePlanClick = (auditId: string) => {
    router.push(`/quality/cap/${auditId}`);
  };


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
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-1/4">Audit</TableHead>
                    <TableHead className="w-3/4">Non-Conformance Findings</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {groupedFindings.length > 0 ? (
                groupedFindings.map(item => {
                    return (
                        <TableRow key={item.auditId}>
                            <TableCell className="align-top py-4">
                                <Link href={`/quality/${item.auditId}`} className="hover:underline text-primary">
                                    <div className="font-medium">{item.auditTitle}</div>
                                    <div className="text-xs text-muted-foreground">{item.auditNumber || item.auditId.substring(0,8) + '...'}</div>
                                </Link>
                            </TableCell>
                            <TableCell className="p-0">
                                <div className="divide-y">
                                    {item.findings.map((finding) => {
                                        const caps = finding.correctiveActionPlans || [];
                                        const allActions = caps.flatMap(cap => cap.actions);
                                        const openActions = allActions.filter(a => a.status === 'Open').length;
                                        const inProgressActions = allActions.filter(a => a.status === 'In Progress').length;
                                        let overallStatus = 'No Plan';
                                        if (allActions.length > 0) {
                                            if (openActions > 0 || inProgressActions > 0) {
                                                overallStatus = 'Open';
                                            } else {
                                                overallStatus = 'Closed';
                                            }
                                        }

                                        return (
                                            <div key={finding.id} className="flex items-center justify-between p-3">
                                                <div className="flex items-start gap-2">
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        {finding.regulationReference || 'N/A'}
                                                    </Badge>
                                                    <p className="font-semibold whitespace-normal">{finding.itemText}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Badge variant={getStatusVariant(overallStatus)} className="w-24 justify-center">{overallStatus}</Badge>
                                                    <Button variant="outline" size="sm" onClick={() => handleManagePlanClick(item.auditId)}>
                                                        <Edit className="mr-2 h-3 w-3" />
                                                        Manage Plans
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </TableCell>
                        </TableRow>
                    )
                })
                ) : (
                <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
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
    </>
  );
}
