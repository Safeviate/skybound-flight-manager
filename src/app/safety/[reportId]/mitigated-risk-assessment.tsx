

'use client';

import { useState, Fragment } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport, CorrectiveAction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssessMitigationForm } from './assess-mitigation-form';

interface MitigatedRiskAssessmentProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
    correctiveActions?: CorrectiveAction[];
}

export function MitigatedRiskAssessment({ report, onUpdate, correctiveActions }: MitigatedRiskAssessmentProps) {
  const [editingRisk, setEditingRisk] = useState<AssociatedRisk | null>(null);

  const { toast } = useToast();

  const handleAssessRisk = (riskId: string, updatedValues: Pick<AssociatedRisk, 'mitigationControls' | 'residualLikelihood' | 'residualSeverity'>) => {
    const updatedRisks = report.associatedRisks?.map(risk => {
        if (risk.id === riskId) {
            const residualRiskScore = getRiskScore(updatedValues.residualLikelihood!, updatedValues.residualSeverity!);
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
  
  const handleOpenAssessDialog = (risk: AssociatedRisk) => {
    const formattedActions = correctiveActions?.map(ca => `- ${ca.action} (Assigned to: ${ca.responsiblePerson}, Deadline: ${ca.deadline})`).join('\n') || '';
    setEditingRisk({ ...risk, mitigationControls: formattedActions });
  }

  return (
    <Fragment>
        <div>
            <h3 className="font-semibold text-lg">Risk Mitigation Assessment</h3>
            <p className="text-sm text-muted-foreground">
                Assess the effectiveness of corrective actions by measuring the residual risk.
            </p>
        </div>
        {report.associatedRisks && report.associatedRisks.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hazard</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Risk Score (Initial <ArrowRight className="inline h-3 w-3" /> Mitigated)</TableHead>
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
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    {risk.residualRiskScore !== undefined ? (
                                        <Badge style={{ backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white' }}>
                                            {risk.residualRiskScore}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">N/A</Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                    <Badge variant="outline">{getRiskLevel(risk.residualRiskScore ?? risk.riskScore)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenAssessDialog(risk)}>
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
                <p className="text-muted-foreground">No hazards or risks have been added for this report yet.</p>
            </div>
        )}
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
    </Fragment>
  );
}
