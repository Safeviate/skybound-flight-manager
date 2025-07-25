
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SafetyReport } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { getRiskScoreColor } from '@/lib/utils.tsx';
import { ArrowRight, Check, ShieldCheck, ShieldAlert, CircleAlert, FileText, CheckCircle } from 'lucide-react';

interface FinalReviewProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport) => void;
}

export function FinalReview({ report, onUpdate }: FinalReviewProps) {
  const handleCloseReport = () => {
    onUpdate({
      ...report,
      status: 'Closed',
      closedDate: new Date().toISOString().split('T')[0],
    });
  };

  const riskLevel = (score: number | null | undefined): string => {
      if (score === null || score === undefined) return 'N/A';
      if (score <= 4) return 'Low';
      if (score <= 9) return 'Medium';
      if (score <= 16) return 'High';
      return 'Extreme';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Final Report Review</CardTitle>
        <CardDescription>
          This is a summary of the entire investigation. Review all sections carefully before closing the report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
             <FileText className="h-5 w-5 text-primary mt-1" />
             <div>
                <h4 className="font-semibold">Initial Report</h4>
                <p className="text-sm text-muted-foreground">{report.details}</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
            <CircleAlert className="h-5 w-5 text-primary mt-1" />
             <div>
                <h4 className="font-semibold">Investigation Findings & Root Cause</h4>
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{report.investigationNotes}</p>
                 {report.correctiveActionPlan?.rootCause && (
                     <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md mt-2">
                        <span className="font-semibold">Root Cause:</span> {report.correctiveActionPlan.rootCause}
                     </p>
                 )}
             </div>
          </div>
          <div className="flex items-start gap-3">
             <ShieldAlert className="h-5 w-5 text-primary mt-1" />
             <div>
                <h4 className="font-semibold">Risk Assessments</h4>
                {report.associatedRisks?.map(risk => (
                    <div key={risk.id} className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{risk.hazard}:</span>
                        <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                            {riskLevel(risk.riskScore)} ({risk.riskScore})
                        </Badge>
                         <ArrowRight className="h-4 w-4" />
                         <Badge style={{ backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white' }}>
                            {riskLevel(risk.residualRiskScore)} ({risk.residualRiskScore})
                        </Badge>
                    </div>
                ))}
             </div>
          </div>
          <div className="flex items-start gap-3">
             <ShieldCheck className="h-5 w-5 text-primary mt-1" />
             <div>
                <h4 className="font-semibold">Corrective Actions</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {report.correctiveActionPlan?.correctiveActions.map((action, index) => (
                        <li key={index}>{action.action}</li>
                    ))}
                </ul>
             </div>
          </div>
        </div>
        <div className="border-t pt-6 flex justify-end">
            <Button 
                onClick={handleCloseReport} 
                disabled={report.status === 'Closed'}
                variant={report.status === 'Closed' ? 'success' : 'destructive'}
            >
                {report.status === 'Closed' ? (
                    <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Report Closed
                    </>
                ) : (
                    'Close Report Permanently'
                )}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
