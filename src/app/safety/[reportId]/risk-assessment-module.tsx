
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Edit } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssessMitigationForm } from './assess-mitigation-form';

interface RiskAssessmentModuleProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
}

export function RiskAssessmentModule({ report, onUpdate }: RiskAssessmentModuleProps) {
  const [editingRisk, setEditingRisk] = useState<AssociatedRisk | null>(null);

  const { toast } = useToast();

  const handleAssessRisk = (riskId: string, updatedValues: Pick<AssociatedRisk, 'mitigationControls' | 'residualLikelihood' | 'residualSeverity'>) => {
    const updatedRisks = report.associatedRisks?.map(risk => {
        if (risk.id === riskId) {
            const residualRiskScore = getRiskScore(updatedValues.residualLikelihood, updatedValues.residualSeverity);
            return {
                ...risk,
                ...updatedValues,
                residualRiskScore
            };
        }
        return risk;
    });

    onUpdate({ ...report, associatedRisks: updatedRisks });
    setEditingRisk(null);
    toast({
        title: 'Mitigation Assessed',
        description: 'The residual risk score has been updated.'
    });
  }
  
  const riskLevel = (score: number | null) => {
      if (score === null || score === undefined) return 'N/A';
      if (score <= 4) return 'Low';
      if (score <= 9) return 'Medium';
      if (score <= 16) return 'High';
      return 'Extreme';
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Risk Mitigation</CardTitle>
            <CardDescription>
                Assess the effectiveness of corrective actions by measuring the residual risk.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {report.associatedRisks && report.associatedRisks.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hazard</TableHead>
                            <TableHead>Risk</TableHead>
                            <TableHead>Risk Score</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {report.associatedRisks.map(risk => (
                            <TableRow key={risk.id}>
                                <TableCell className="max-w-xs">{risk.hazard}</TableCell>
                                <TableCell className="max-w-xs">{risk.risk}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                            {risk.riskScore}
                                        </Badge>
                                        {risk.residualRiskScore !== undefined && (
                                            <>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <Badge style={{ backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white' }}>
                                                    {risk.residualRiskScore}
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                     <Badge variant="outline">{riskLevel(risk.residualRiskScore ?? risk.riskScore)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setEditingRisk(risk)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Assess
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            ) : (
                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No hazards or risks have been added yet.</p>
                </div>
            )}
        </CardContent>
         {editingRisk && (
            <Dialog open={!!editingRisk} onOpenChange={(isOpen) => !isOpen && setEditingRisk(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assess Risk Mitigation</DialogTitle>
                        <DialogDescription>
                           For: "{editingRisk.hazard}"
                        </DialogDescription>
                    </DialogHeader>
                    <AssessMitigationForm risk={editingRisk} onAssessRisk={handleAssessRisk} />
                </DialogContent>
            </Dialog>
         )}
    </Card>
  );
}
