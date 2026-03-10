'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import type { QualityAudit, NonConformanceIssue } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CapTrackerProps {
  audits: QualityAudit[];
}

export default function CapTracker({ audits }: CapTrackerProps) {
  const allFindings = React.useMemo(() => {
    return audits.flatMap(audit => 
      (audit.nonConformanceIssues || []).map(issue => ({
        ...issue,
        auditId: audit.id,
        auditNumber: audit.auditNumber || audit.id.substring(0, 8),
        auditDate: audit.date,
      }))
    ).sort((a, b) => parseISO(b.auditDate).getTime() - parseISO(a.auditDate).getTime());
  }, [audits]);

  const getStatusInfo = (issue: NonConformanceIssue) => {
    const plans = issue.correctiveActionPlan || []; // Use CorrectiveActionPlan[] based on types.ts
    if (plans.length === 0) {
      return { label: 'Needs CAP', variant: 'destructive' as const, icon: <AlertTriangle className="h-3 w-3" /> };
    }
    
    const allActions = plans.flatMap(p => p.actions);
    if (allActions.length === 0) {
        return { label: 'Needs Actions', variant: 'warning' as const, icon: <Clock className="h-3 w-3" /> };
    }

    const completed = allActions.filter(a => a.status === 'Closed').length;
    if (completed === allActions.length) {
      return { label: 'Actions Closed', variant: 'success' as const, icon: <CheckCircle className="h-3 w-3" /> };
    }
    
    return { label: `${completed}/${allActions.length} Closed`, variant: 'primary' as const, icon: <Clock className="h-3 w-3" /> };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan (CAPS) Tracker</CardTitle>
        <CardDescription>
          Monitoring all non-conformance findings and the progress of their corrective actions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[30%]">Finding Description</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>CAP Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFindings.length > 0 ? (
                allFindings.map((finding, index) => {
                  const status = getStatusInfo(finding);
                  return (
                    <TableRow key={`${finding.auditId}-${index}`}>
                      <TableCell className="font-medium">
                        <Link href={`/quality/${finding.auditId}`} className="hover:underline">
                          {finding.auditNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{format(parseISO(finding.auditDate), 'dd MMM yy')}</TableCell>
                      <TableCell className="max-w-xs truncate" title={finding.itemText}>
                        {finding.itemText}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {finding.regulationReference || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={finding.level === 'Level 1 Finding' ? 'destructive' : 'warning'} className="text-[10px] h-5">
                          {finding.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="gap-1 text-[10px] h-5">
                          {status.icon}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/quality/cap/${finding.auditId}`}>
                            Manage CAP
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No non-conformance findings found across active audits.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
