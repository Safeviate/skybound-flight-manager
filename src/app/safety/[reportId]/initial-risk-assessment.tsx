

'use client';

import React, { useState, useActionState, Fragment } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { likelihoodValues, severityValues } from '@/lib/data-provider';


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

function HazardSuggestionsResult({ data, onAddHazard }: { data: SuggestHazardsOutput, onAddHazard: (hazards: Omit<AssociatedRisk, 'id'>[]) => void }) {
    const [editableSuggestions, setEditableSuggestions] = useState(data.suggestedHazards);
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    const handleFieldChange = (index: number, field: keyof typeof editableSuggestions[0], value: string) => {
        const newSuggestions = [...editableSuggestions];
        newSuggestions[index] = { ...newSuggestions[index], [field]: value };
        setEditableSuggestions(newSuggestions);
    };

    const handleCheckboxChange = (index: number, checked: boolean) => {
        if (checked) {
            setSelectedIndices(prev => [...prev, index]);
        } else {
            setSelectedIndices(prev => prev.filter(i => i !== index));
        }
    }

    const handleAddSelected = () => {
        const hazardsToAdd = selectedIndices.map(index => {
            const suggestion = editableSuggestions[index];
            return {
                ...suggestion,
                hazardArea: '', // Default values to be filled in later
                process: '',
            };
        });
        onAddHazard(hazardsToAdd);
        setSelectedIndices([]);
    }

    return (
        <div className="space-y-4 p-4 border-t mt-4">
            <h4 className="font-semibold text-sm">AI Suggested Hazards</h4>
            <p className="text-xs text-muted-foreground">Review and edit the suggestions below before adding them to the report.</p>
            <div className="space-y-4">
                {editableSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 p-4 border rounded-lg bg-muted/50">
                        <Checkbox
                            id={`hazard-select-${index}`}
                            onCheckedChange={(checked) => handleCheckboxChange(index, !!checked)}
                            checked={selectedIndices.includes(index)}
                            className="mt-2"
                        />
                        <div className="grid gap-2 text-sm flex-1">
                            <div>
                                <Label htmlFor={`hazard-text-${index}`} className="font-medium">Hazard</Label>
                                <Textarea id={`hazard-text-${index}`} value={suggestion.hazard} onChange={(e) => handleFieldChange(index, 'hazard', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor={`risk-text-${index}`} className="font-medium">Risk</Label>
                                <Textarea id={`risk-text-${index}`} value={suggestion.risk} onChange={(e) => handleFieldChange(index, 'risk', e.target.value)} />
                            </div>
                             <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label>Likelihood</Label>
                                    <Select value={suggestion.likelihood} onValueChange={(value) => handleFieldChange(index, 'likelihood', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {likelihoodValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div>
                                    <Label>Severity</Label>
                                    <Select value={suggestion.severity} onValueChange={(value) => handleFieldChange(index, 'severity', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {severityValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
            {selectedIndices.length > 0 && (
                <div className="flex justify-end">
                    <Button onClick={handleAddSelected}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Selected ({selectedIndices.length}) to Register
                    </Button>
                </div>
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
  
  const handleAddMultipleRisks = (risksData: Omit<AssociatedRisk, 'id'>[]) => {
    const newRisks = risksData.map((riskData, index) => {
        const riskScore = getRiskScore(riskData.likelihood, riskData.severity);
        return {
            ...riskData,
            id: `risk-${Date.now()}-${index}`,
            riskScore,
        };
    });

    const updatedRisks = [...(report.associatedRisks || []), ...newRisks];
    onUpdate({ ...report, associatedRisks: updatedRisks });

    toast({
        title: `${newRisks.length} Hazards Added`,
        description: 'The selected AI suggestions have been added to the register.'
    });
  }

  const riskLevel = (score: number | null | undefined) => {
      if (score === null || score === undefined || isNaN(score)) return 'N/A';
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
                onAddHazard={handleAddMultipleRisks}
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
                                    {!isNaN(risk.riskScore) ? risk.riskScore : 'N/A'}
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



