
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
  finding: NonConformanceIssue;
}

export function CapTracker({ audits, personnel, onUpdateAudit }: { audits: QualityAudit[], personnel: User[], onUpdateAudit: (updatedAudit: Partial<QualityAudit>) => void }) {
  const router = useRouter();

  const allFindings = React.useMemo(() => {
    return audits
      .filter(audit => audit.status !== 'Archived' && audit.nonConformanceIssues.length > 0)
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

  const handleManagePlanClick = (item: CapItem) => {
    router.push(`/quality/cap/${item.auditId}`);
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
                                <Button variant="secondary" size="sm" onClick={() => handleManagePlanClick(item)}>
                                    <Edit className="mr-2 h-3 w-3" />
                                    Manage Plans
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
    </>
  );
}
