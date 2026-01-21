'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { QualityAudit, CorrectiveAction } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';

interface CapTrackerProps {
  audits: QualityAudit[];
}

export function CapTracker({ audits }: CapTrackerProps) {

  const allCorrectiveActions = React.useMemo(() => {
    const actions: (CorrectiveAction & { auditId: string, auditNumber: string, findingText: string, rootCause: string })[] = [];
    
    audits.forEach(audit => {
      if (audit.nonConformanceIssues) {
        audit.nonConformanceIssues.forEach(issue => {
          if (issue.correctiveActionPlans) {
            issue.correctiveActionPlans.forEach(plan => {
              plan.actions.forEach(action => {
                actions.push({
                  ...action,
                  auditId: audit.id,
                  auditNumber: audit.auditNumber || audit.id.substring(0,8),
                  findingText: issue.itemText,
                  rootCause: plan.rootCause,
                });
              });
            });
          }
        });
      }
    });
    return actions;
  }, [audits]);

  const groupedByAudit = React.useMemo(() => {
      return allCorrectiveActions.reduce((acc, action) => {
          const key = action.auditNumber;
          if (!acc[key]) {
              acc[key] = {
                  auditId: action.auditId,
                  tasks: []
              };
          }
          acc[key].tasks.push(action);
          return acc;
      }, {} as Record<string, { auditId: string, tasks: typeof allCorrectiveActions }>);
  }, [allCorrectiveActions]);
  
  const getStatusVariant = (status: CorrectiveAction['status']) => {
    switch (status) {
        case 'Open': return 'warning';
        case 'In Progress': return 'primary';
        case 'Closed': return 'success';
        default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan (CAP) Tracker</CardTitle>
        <CardDescription>
          This tracks all corrective and preventative actions resulting from quality audit findings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedByAudit).length > 0 ? (
          <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedByAudit)}>
            {Object.entries(groupedByAudit).map(([auditNumber, group]) => (
              <AccordionItem value={auditNumber} key={auditNumber}>
                <AccordionTrigger>
                   <div className="flex items-center gap-4">
                    <span className="font-semibold">{`Audit: ${auditNumber}`}</span>
                    <Badge>{group.tasks.length} Action(s)</Badge>
                </div>
                </AccordionTrigger>
                <AccordionContent>
                   <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Action</TableHead>
                            <TableHead>Finding</TableHead>
                            <TableHead>Responsible</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {group.tasks.map(task => (
                            <TableRow key={task.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium whitespace-normal">{task.action}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-normal">{task.findingText}</TableCell>
                                <TableCell>{task.responsiblePerson}</TableCell>
                                <TableCell>{format(parseISO(task.completionDate), 'PPP')}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                   </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No corrective action plans found.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
