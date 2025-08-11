

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { QualityAudit, NonConformanceIssue } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock, Edit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CapItem {
  auditId: string;
  auditNumber?: string;
  auditTitle: string;
  finding: NonConformanceIssue;
}

export function CapTracker({ audits }: { audits: QualityAudit[] }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
        <CardDescription>
          A centralized view of all non-conformance findings and their corrective action plans.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                                <Link href={`/quality/${item.auditId}`}>
                                    <Button variant="secondary" size="sm">
                                        <Edit className="mr-2 h-3 w-3" />
                                        Create CAP
                                    </Button>
                                </Link>
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
      </CardContent>
    </Card>
  );
}
