
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { QualityAudit, NonConformanceIssue, CorrectiveActionPlan, CorrectiveAction, User, Department } from '@/lib/types';
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

  const groupedByDepartment = React.useMemo(() => {
    const auditsWithFindings = audits.filter(
      audit => audit.status !== 'Archived' && audit.nonConformanceIssues && audit.nonConformanceIssues.length > 0
    );

    return auditsWithFindings.reduce((acc, audit) => {
        const department: Department = audit.department || 'Uncategorized';
        if (!acc[department]) {
            acc[department] = [];
        }
        acc[department].push(audit);
        return acc;
    }, {} as Record<Department, QualityAudit[]>);

  }, [audits]);

  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case 'Open': return 'warning';
      case 'In Progress': return 'primary';
      case 'Closed': return 'success';
      default: return 'outline';
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
          A centralized view of all non-conformance findings and their corrective action plans, grouped by department.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.keys(groupedByDepartment).sort().map(department => {
            const departmentAudits = groupedByDepartment[department as Department];
            return (
                <div key={department}>
                    <h3 className="text-lg font-semibold mb-2">{department}</h3>
                    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">Audit</TableHead>
                                <TableHead className="w-[15%]">Findings</TableHead>
                                <TableHead className="w-[15%]">Status</TableHead>
                                <TableHead className="w-[40%]" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {departmentAudits.length > 0 ? (
                            departmentAudits.map(item => {
                                const allActions = item.nonConformanceIssues.flatMap(f => f.correctiveActionPlans || []).flatMap(p => p.actions);
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
                                    <TableRow key={item.id}>
                                        <TableCell className="align-middle py-4">
                                            <Link href={`/quality/${item.id}`} className="hover:underline text-primary">
                                                <div className="font-medium whitespace-normal">{item.title}</div>
                                                <div className="text-xs text-muted-foreground">{item.auditNumber || item.id.substring(0,8) + '...'}</div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <Badge variant="destructive">{item.nonConformanceIssues.length} Finding(s)</Badge>
                                        </TableCell>
                                        <TableCell className="align-middle">
                                            <Badge variant={getStatusVariant(overallStatus)} className="w-24 justify-center">{overallStatus}</Badge>
                                        </TableCell>
                                        <TableCell className="align-middle text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleManagePlanClick(item.id)}>
                                                <Edit className="mr-2 h-3 w-3" />
                                                Manage Plans
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                            ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                No non-conformance findings or corrective action plans found in this department.
                                </TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )
        })}
        {Object.keys(groupedByDepartment).length === 0 && (
             <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                No non-conformance findings or corrective action plans found.
            </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
