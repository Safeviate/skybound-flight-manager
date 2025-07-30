

'use client';

import React, { useState, useActionState, Fragment } from 'react';
import { useForm, useFormContext } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport, Risk as RiskRegisterEntry, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ArrowUpCircle, Bot, Loader2, Edit, Save } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRiskForm } from './add-risk-form';
import { promoteRiskAction, suggestHazardsAction } from './actions';
import type { SuggestHazardsOutput } from '@/ai/flows/suggest-hazards-flow';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiskAssessmentTool } from './risk-assessment-tool';
import { z } from 'zod';

const hazardAreas = ['Flight Operations', 'Maintenance', 'Ground Operations', 'Cabin Safety', 'Occupational Safety', 'Security', 'Administration & Management'];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];
const likelihoodValues: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityValues: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];

const assessHazardFormSchema = z.object({
  hazard: z.string().min(10, { message: 'Hazard description must be at least 10 characters long.' }),
  risk: z.string().min(10, { message: 'Risk description must be at least 10 characters long.' }),
  likelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.'}),
  severity: z.enum(severityValues, { required_error: 'Severity is required.'}),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
});

type AssessHazardFormValues = z.infer<typeof assessHazardFormSchema>;

const severityMap: Record<RiskSeverity, string> = { 'Catastrophic': 'A', 'Hazardous': 'B', 'Major': 'C', 'Minor': 'D', 'Negligible': 'E' };
const likelihoodMap: Record<RiskLikelihood, number> = { 'Frequent': 5, 'Occasional': 4, 'Remote': 3, 'Improbable': 2, 'Extremely Improbable': 1 };


function AssessHazardDialog({ suggestion, onAddRisk, onCancel }: { suggestion: Omit<AssociatedRisk, 'id'>, onAddRisk: (risk: Omit<AssociatedRisk, 'id'>) => void, onCancel: () => void }) {
    const form = useForm<AssessHazardFormValues>({
        resolver: zodResolver(assessHazardFormSchema),
        defaultValues: {
            hazard: suggestion.hazard,
            risk: suggestion.risk,
            likelihood: suggestion.likelihood,
            severity: suggestion.severity,
        },
    });

    const watchedLikelihood = form.watch('likelihood');
    const watchedSeverity = form.watch('severity');

    const handleAssessmentChange = (likelihood: RiskLikelihood, severity: RiskSeverity) => {
        form.setValue('likelihood', likelihood, { shouldValidate: true });
        form.setValue('severity', severity, { shouldValidate: true });
    };

    const getSelectedCode = () => {
        if (watchedLikelihood && watchedSeverity) {
            return `${likelihoodMap[watchedLikelihood]}${severityMap[watchedSeverity]}`;
        }
        return null;
    }

    const onSubmit = (data: AssessHazardFormValues) => {
        onAddRisk(data);
    };
    
    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>Assess Suggested Hazard</DialogTitle>
                <DialogDescription>
                    Review, edit, and score the AI-suggested hazard before adding it to the report's register.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="hazard"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hazard</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="risk"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Associated Risk</FormLabel>
                                    <FormControl><Textarea {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="hazardArea"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Hazard Area</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an area" /></SelectTrigger></FormControl>
                                    <SelectContent>{hazardAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="process"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Process / Activity</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a process" /></SelectTrigger></FormControl>
                                    <SelectContent>{processes.map(proc => <SelectItem key={proc} value={proc}>{proc}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <RiskAssessmentTool onCellClick={handleAssessmentChange} selectedCode={getSelectedCode()} />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button type="submit"><Save className="mr-2 h-4 w-4" /> Save Hazard</Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    )
}

function HazardSuggestionsResult({ data, onAddRisk }: { data: SuggestHazardsOutput, onAddRisk: (risk: Omit<AssociatedRisk, 'id'>) => void }) {
    const [assessingSuggestion, setAssessingSuggestion] = useState<Omit<AssociatedRisk, 'id'> | null>(null);

    return (
        <div className="space-y-4 p-4 border-t mt-4">
            <h4 className="font-semibold text-sm">AI Suggested Hazards</h4>
            <p className="text-xs text-muted-foreground">Review and assess each suggestion before adding it to the report.</p>
            <div className="space-y-2">
                {data.suggestedHazards.map((suggestion, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-muted/50">
                        <div className="flex-1 text-sm">
                            <p className="font-semibold">{suggestion.hazard}</p>
                            <p className="text-muted-foreground">{suggestion.risk}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setAssessingSuggestion(suggestion)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Assess
                        </Button>
                    </div>
                ))}
            </div>
            {assessingSuggestion && (
                 <Dialog open={!!assessingSuggestion} onOpenChange={(isOpen) => !isOpen && setAssessingSuggestion(null)}>
                    <AssessHazardDialog 
                        suggestion={assessingSuggestion} 
                        onAddRisk={(risk) => {
                            onAddRisk(risk);
                            setAssessingSuggestion(null);
                        }} 
                        onCancel={() => setAssessingSuggestion(null)}
                    />
                </Dialog>
            )}
        </div>
    );
}

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
                onAddRisk={handleAddRisk}
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
                                { !isNaN(risk.riskScore) ? (
                                    <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                        {risk.riskScore}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">N/A</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{getRiskLevel(risk.riskScore)}</Badge>
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
