
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRiskForm } from './add-risk-form';

interface InitialRiskAssessmentProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
}

export function InitialRiskAssessment({ report, onUpdate }: InitialRiskAssessmentProps) {
  const [isAddRiskOpen, setIsAddRiskOpen] = useState(false);
  const { toast } = useToast();

  const handleAddRisk = (newRiskData: Omit<AssociatedRisk, 'id'>) => {
    const riskScore = getRiskScore(newRiskData.likelihood, newRiskData.severity);
    const newRisk: AssociatedRisk = {
        ...newRiskData,
        id: `risk-${Date.now()}`,
        riskScore,
    };
    
    const updatedRisks = [...(report.associatedRisks || []), newRisk];
    onUpdate({ ...report, associatedRisks: updatedRisks });
    
    setIsAddRiskOpen(false);
    toast({
        title: 'Hazard Added to Register',
        description: 'The new hazard and its initial risk score have been recorded.'
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
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Initial Risk Assessment</CardTitle>
                <CardDescription>
                    Identify hazards associated with this report and assess their initial risk level.
                </CardDescription>
            </div>
            <Dialog open={isAddRiskOpen} onOpenChange={setIsAddRiskOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Hazard & Risk
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Hazard & Risk</DialogTitle>
                        <DialogDescription>
                            Describe the hazard, the potential risk, and use the matrix to set an initial score.
                        </DialogDescription>
                    </DialogHeader>
                    <AddRiskForm onAddRisk={handleAddRisk} />
                </DialogContent>
            </Dialog>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {report.associatedRisks.map(risk => (
                            <TableRow key={risk.id}>
                                <TableCell className="max-w-xs">{risk.hazard}</TableCell>
                                <TableCell className="max-w-xs">{risk.risk}</TableCell>
                                <TableCell>
                                    <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                        {risk.riskScore}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                     <Badge variant="outline">{riskLevel(risk.riskScore)}</Badge>
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
    </Card>
  );
}
