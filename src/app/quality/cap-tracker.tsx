
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { QualityAudit, NonConformanceIssue } from '@/lib/types';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface CapItem {
  auditId: string;
  auditTitle: string;
  finding: NonConformanceIssue;
}

export function CapTracker({ audits }: { audits: QualityAudit[] }) {
  const allCaps = React.useMemo(() => {
    return audits
      .filter(audit => audit.status !== 'Archived')
      .flatMap(audit =>
        (audit.nonConformanceIssues || [])
          .filter(issue => issue.correctiveActionPlan)
          .map(issue => ({
            auditId: audit.id,
            auditTitle: audit.title,
            finding: issue,
          }))
      );
  }, [audits]);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Open': return 'warning';
      case 'In Progress': return 'primary';
      case 'Closed': return 'success';
      default: return 'outline';
    }
  }
  
  const getOverdueVariant = (dueDate: string) => {
    const days = differenceInDays(new Date(), parseISO(dueDate));
    if (days > 0) return 'destructive';
    if (days > -7) return 'warning';
    return 'default';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
        <CardDescription>
          A centralized view of all active corrective action plans for non-conformance findings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audit</TableHead>
              <TableHead>Finding</TableHead>
              <TableHead>Responsible Person</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allCaps.length > 0 ? (
              allCaps.map(item => {
                const cap = item.finding.correctiveActionPlan!;
                const isOverdue = cap.status !== 'Closed' && differenceInDays(new Date(), parseISO(cap.completionDate)) > 0;
                
                return (
                    <TableRow key={item.finding.id}>
                        <TableCell>
                            <Link href={`/quality/${item.auditId}`} className="hover:underline text-primary">
                                <div className="font-medium">{item.auditTitle}</div>
                                <div className="text-xs text-muted-foreground">{item.auditId.substring(0,8)}...</div>
                            </Link>
                        </TableCell>
                        <TableCell className="max-w-sm">
                            <p>{item.finding.itemText}</p>
                            <p className="text-xs text-muted-foreground">{item.finding.regulationReference}</p>
                        </TableCell>
                        <TableCell>{cap.responsiblePerson}</TableCell>
                        <TableCell>
                            <Badge variant={getOverdueVariant(cap.completionDate)}>
                                {isOverdue && <Clock className="mr-1 h-3 w-3" />}
                                {format(parseISO(cap.completionDate), 'MMM d, yyyy')}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(cap.status)}>{cap.status}</Badge>
                        </TableCell>
                    </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No active Corrective Action Plans found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
