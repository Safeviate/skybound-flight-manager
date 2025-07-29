
'use client';

import React, { useState, useActionState, Fragment } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport, Risk as RiskRegisterEntry, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ArrowUpCircle, Bot, Loader2, Edit } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRiskForm } from './add-risk-form';
import { promoteRiskAction, suggestHazardsAction } from './actions';
import type { SuggestHazardsOutput } from '@/ai/flows/suggest-hazards-flow';
import { Label } from '@/components/ui/label';

interface InitialRiskAssessmentProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
    onPromoteRisk: (newRisk: RiskRegisterEntry) => void;
}

function SuggestHazardsButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-full">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
        AI Hazard Suggestions
      </Button>
    );
}

function HazardSuggestionsResult({ data, onAddHazard }: { data: SuggestHazardsOutput, onAddHazard: (hazard: Omit<AssociatedRisk, 'id'>) => void }) {
    const [editingHazard, setEditingHazard] = useState<Omit<AssociatedRisk, 'id'> | null>(null);

    const handleEditClick = (hazard: { hazard: string; risk: string; likelihood: RiskLikelihood; severity: RiskSeverity }) => {
        setEditingHazard({
            ...hazard,
            hazardArea: '',
            process: '',
        });
    };
    
    const handleSave = (updatedHazard: Omit<AssociatedRisk, 'id'>) => {
        onAddHazard(updatedHazard);
        setEditingHazard(null);
    }

    return (
        <div className="space-y-4 p-4 border-t mt-4">
            <h4 className="font-semibold text-sm">AI Suggested Hazards</h4>
            <div className="space-y-2">
                {data.suggestedHazards.map((hazard, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 p-2 border rounded-md bg-muted/50">
                        <div className="grid gap-1 text-sm flex-1">
                            <p className="font-semibold">{hazard.hazard}</p>
                            <p className="text-muted-foreground"><span className="font-medium">Risk:</span> {hazard.risk}</p>
                            <p className="text-muted-foreground">
                                <span className="font-medium">Est. Likelihood:</span> {hazard.likelihood}, <span className="font-medium">Est. Severity:</span> {hazard.severity}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(hazard)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Review & Add
                        </Button>
                    </div>
                ))}
            </div>
             {editingHazard && (
                <Dialog open={!!editingHazard} onOpenChange={() => setEditingHazard(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Review AI Suggested Hazard</DialogTitle>
                            <DialogDescription>
                                Review and edit the details suggested by the AI before adding it to the report.
                            </DialogDescription>
                        </DialogHeader>
                        <AddRiskForm 
                            onAddRisk={handleSave} 
                            initialValues={editingHazard}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

export function InitialRiskAssessment({ report, onUpdate, onPromoteRisk }: InitialRiskAssessmentProps) {
  const [isAddRiskOpen, setIsAddRiskOpen] = useState(false);
  const { toast } = useToast();
  const [suggestHazardsState, suggestHazardsFormAction] = useActionState(suggestHazardsAction, { message: '', data: null });

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
    <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1">
                <h3 className="font-semibold text-lg">Initial Risk Assessment</h3>
                <p className="text-sm text-muted-foreground">
                    Identify hazards associated with this report and assess their initial risk level.
                </p>
            </div>
            <div className="flex flex-col items-end gap-2 w-52">
                <Dialog open={isAddRiskOpen} onOpenChange={setIsAddRiskOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Hazard Manually
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
                <form action={suggestHazardsFormAction} className="w-full">
                    <input type="hidden" name="reportText" value={report.details} />
                    <SuggestHazardsButton />
                </form>
            </div>
        </div>

        {suggestHazardsState.data && (
            <HazardSuggestionsResult 
                data={suggestHazardsState.data as SuggestHazardsOutput} 
                onAddHazard={handleAddRisk}
            />
        )}
        {report.associatedRisks && report.associatedRisks.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hazard</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right no-print">Actions</TableHead>
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
                            <TableCell className="text-right no-print">
                                <form action={async (formData) => {
                                    const result = await promoteRiskAction(null, formData);
                                    if (result.data) {
                                        toast({
                                            title: 'Risk Promoted',
                                            description: 'The hazard has been added to the central Risk Register.'
                                        });
                                        onUpdate({
                                            ...report,
                                            associatedRisks: report.associatedRisks?.map(r => r.id === risk.id ? { ...r, promotedToRegister: true } : r)
                                        });
                                        onPromoteRisk({
                                            id: `risk-reg-${Date.now()}`,
                                            companyId: report.companyId,
                                            dateIdentified: new Date().toISOString().split('T')[0],
                                            description: result.data.description,
                                            consequences: [risk.risk], // Use the original risk as the consequence
                                            hazard: risk.hazard,
                                            risk: risk.risk,
                                            likelihood: risk.likelihood,
                                            severity: risk.severity,
                                            riskScore: risk.riskScore,
                                            status: result.data.status,
                                            mitigation: result.data.mitigation,
                                            hazardArea: result.data.hazardArea,
                                            process: result.data.process,
                                            reportNumber: result.data.reportNumber,
                                        });
                                    } else if (result.message) {
                                        toast({ variant: 'destructive', title: 'Error', description: result.message });
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
    </div>
  );
}
