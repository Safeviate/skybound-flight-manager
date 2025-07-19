
'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport, Risk as RiskRegisterEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ArrowUpCircle } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRiskForm } from './add-risk-form';
import { promoteRiskAction } from './actions';

interface InitialRiskAssessmentProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
    onPromoteRisk: (newRisk: RiskRegisterEntry) => void;
}

function PromoteButton({ risk, promoted }: { risk: AssociatedRisk, promoted?: boolean }) {
    const { toast } = useToast();
    const [state, formAction] = useFormState(promoteRiskAction, { message: '', data: null });

    React.useEffect(() => {
        if (state.message === 'Risk promoted successfully') {
            toast({
                title: 'Risk Promoted',
                description: 'The hazard has been added to the central Risk Register.'
            });
            // We can't update the central state from here directly,
            // so we will rely on the parent component to handle it.
            // A more robust solution might use a global state manager.
        } else if (state.message && !state.data) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: state.message,
            });
        }
    }, [state, toast]);

    const isPromoted = promoted || (state.data && state.message === 'Risk promoted successfully');

    if (isPromoted) {
        return <Button size="sm" variant="success" disabled><ArrowUpCircle className="mr-2 h-4 w-4" /> Promoted</Button>;
    }
    
    return (
        <form action={formAction}>
            <input type="hidden" name="riskToPromote" value={JSON.stringify(risk)} />
            <Button size="sm" type="submit"><ArrowUpCircle className="mr-2 h-4 w-4" /> Promote to Register</Button>
        </form>
    );
}

export function InitialRiskAssessment({ report, onUpdate, onPromoteRisk }: InitialRiskAssessmentProps) {
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
                            <TableHead className="text-right">Actions</TableHead>
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
                                <TableCell className="text-right">
                                    <form action={async (formData) => {
                                        const result = await promoteRiskAction(null, formData);
                                        if (result.data) {
                                            onUpdate({
                                                ...report,
                                                associatedRisks: report.associatedRisks?.map(r => r.id === risk.id ? { ...r, promotedToRegister: true } : r)
                                            });
                                            onPromoteRisk({
                                                id: `risk-reg-${Date.now()}`,
                                                dateIdentified: new Date().toISOString().split('T')[0],
                                                description: result.data.description,
                                                likelihood: risk.likelihood,
                                                severity: risk.severity,
                                                riskScore: risk.riskScore,
                                                status: result.data.status,
                                                mitigation: result.data.mitigation,
                                                hazardArea: result.data.hazardArea,
                                                process: result.data.process,
                                            });
                                        }
                                    }}>
                                        <input type="hidden" name="riskToPromote" value={JSON.stringify(risk)} />
                                        <input type="hidden" name="report" value={JSON.stringify(report)} />
                                        <Button size="sm" type="submit" disabled={risk.promotedToRegister}>
                                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                                            {risk.promotedToRegister ? 'Promoted' : 'Promote'}
                                        </Button>
                                    </form>
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
