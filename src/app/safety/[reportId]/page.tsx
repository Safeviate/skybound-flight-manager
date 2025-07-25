

'use client';

import { useEffect, useState, useActionState, useMemo, FC, Fragment, useCallback } from 'react';
import React from 'react';
import { useFormStatus } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { SafetyReport, SuggestInvestigationStepsOutput, GenerateCorrectiveActionPlanOutput, CorrectiveAction, Risk as RiskRegisterEntry, FiveWhysAnalysisOutput, Company } from '@/lib/types';
import { suggestStepsAction, generatePlanAction, fiveWhysAnalysisAction } from './actions';
import { AlertCircle, ArrowLeft, ArrowRight, Bot, ClipboardList, Info, Lightbulb, ListChecks, Loader2, User, Users, FileText, Target, Milestone, Upload, MoreHorizontal, CheckCircle, ShieldCheck, MapPin, PlusCircle as PlusCircleIcon, Trash2, Calendar as CalendarIcon, Edit, Save, Printer, PlusCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { InvestigationTeamForm } from './investigation-team-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ICAO_OCCURRENCE_CATEGORIES, ICAO_PHASES_OF_FLIGHT } from '@/lib/types';
import { DiscussionSection } from './discussion-section';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ICAO_CODE_DEFINITIONS } from '@/lib/icao-codes';
import { Input } from '@/components/ui/input';
import { InitialRiskAssessment } from './initial-risk-assessment';
import { MitigatedRiskAssessment } from './mitigated-risk-assessment';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';


const getStatusVariant = (status: SafetyReport['status']) => {
  switch (status) {
    case 'Open': return 'destructive';
    case 'Under Review': return 'warning';
    case 'Closed': return 'success';
    default: return 'outline';
  }
};

function SuggestStepsButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
        Suggest Investigation Steps
      </Button>
    );
}

function GeneratePlanButton() {
    const { pending } = useFormStatus();
    return (
      <Button variant="secondary" type="submit" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
        Generate Corrective Action Plan
      </Button>
    );
}

function FiveWhysButton() {
    const { pending } = useFormStatus();
    return (
        <Button variant="outline" type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            Start 5 Whys Analysis
        </Button>
    );
}

function InvestigationAnalysisResult({ data, onIncorporate }: { data: SuggestInvestigationStepsOutput, onIncorporate: (text: string) => void }) {
    const [selected, setSelected] = useState<{
        initialAssessment: boolean;
        keyAreas: string[];
        recommendedActions: string[];
        potentialFactors: string[];
    }>({
        initialAssessment: false,
        keyAreas: [],
        recommendedActions: [],
        potentialFactors: [],
    });

    const handleIncorporate = () => {
        let textToIncorporate = "";
        if (selected.initialAssessment) {
            textToIncorporate += `**Initial Assessment:**\n${data.initialAssessment}\n\n`;
        }

        if (selected.keyAreas.length > 0) {
            textToIncorporate += `**Key Areas to Investigate:**\n${selected.keyAreas.map(item => `- ${item}`).join('\n')}\n\n`;
        }

        if (selected.recommendedActions.length > 0) {
            textToIncorporate += `**Recommended Immediate Actions:**\n${selected.recommendedActions.map(item => `- ${item}`).join('\n')}\n\n`;
        }

        if (selected.potentialFactors.length > 0) {
            textToIncorporate += `**Potential Contributing Factors:**\n${selected.potentialFactors.map(item => `- ${item}`).join('\n')}\n\n`;
        }
        
        if (textToIncorporate.length > 0) {
            onIncorporate(textToIncorporate);
        }
    };
    
    const isAnythingSelected =
        selected.initialAssessment ||
        selected.keyAreas.length > 0 ||
        selected.recommendedActions.length > 0 ||
        selected.potentialFactors.length > 0;

    const handleToggle = (type: 'initialAssessment' | 'keyArea' | 'recommendedAction' | 'potentialFactor', value: string | boolean) => {
        setSelected(prev => {
            const newSelected = { ...prev };
            const item = value as string;
            switch (type) {
                case 'initialAssessment':
                    newSelected.initialAssessment = !newSelected.initialAssessment;
                    break;
                case 'keyArea':
                    if (newSelected.keyAreas.includes(item)) {
                        newSelected.keyAreas = newSelected.keyAreas.filter(k => k !== item);
                    } else {
                        newSelected.keyAreas.push(item);
                    }
                    break;
                case 'recommendedAction':
                    if (newSelected.recommendedActions.includes(item)) {
                        newSelected.recommendedActions = newSelected.recommendedActions.filter(a => a !== item);
                    } else {
                        newSelected.recommendedActions.push(item);
                    }
                    break;
                case 'potentialFactor':
                    if (newSelected.potentialFactors.includes(item)) {
                        newSelected.potentialFactors = newSelected.potentialFactors.filter(f => f !== item);
                    } else {
                        newSelected.potentialFactors.push(item);
                    }
                    break;
            }
            return newSelected;
        });
    };


    return (
      <Card className="mt-6">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Bot /> AI-Suggested Investigation Plan</CardTitle>
            <CardDescription>
              Select the suggestions you want to add to your official investigation notes.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center space-x-3">
                    <Checkbox id="select-assessment" onCheckedChange={() => handleToggle('initialAssessment', true)} />
                    <Label htmlFor="select-assessment" className="text-base font-semibold flex items-center gap-2">
                        <ClipboardList /> Initial Assessment
                    </Label>
                </div>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md ml-7">{data.initialAssessment}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <h3 className="font-semibold text-base flex items-center gap-2"><ListChecks /> Key Areas to Investigate</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        {data.keyAreasToInvestigate.map((item, i) => (
                            <li key={i} className="flex items-center space-x-3">
                                <Checkbox id={`key-area-${i}`} onCheckedChange={() => handleToggle('keyArea', item)} />
                                <Label htmlFor={`key-area-${i}`}>{item}</Label>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-base flex items-center gap-2"><AlertCircle /> Recommended Immediate Actions</h3>
                     <ul className="space-y-2 text-sm text-muted-foreground">
                        {data.recommendedActions.map((item, i) => (
                            <li key={i} className="flex items-center space-x-3">
                                <Checkbox id={`rec-action-${i}`} onCheckedChange={() => handleToggle('recommendedAction', item)} />
                                <Label htmlFor={`rec-action-${i}`}>{item}</Label>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="space-y-2">
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Users /> Potential Contributing Factors
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground ml-2">
                    {data.potentialContributingFactors.map((item, i) => (
                         <li key={i} className="flex items-center space-x-3">
                            <Checkbox id={`factor-${i}`} onCheckedChange={() => handleToggle('potentialFactor', item)} />
                            <Label htmlFor={`factor-${i}`}>{item}</Label>
                        </li>
                    ))}
                </ul>
            </div>
        </CardContent>
        <CardFooter>
             <Button onClick={handleIncorporate} disabled={!isAnythingSelected}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Incorporate Selected Suggestions
            </Button>
        </CardFooter>
      </Card>
    );
}

interface CorrectiveActionPlanResultProps {
    plan: GenerateCorrectiveActionPlanOutput;
    setPlan: React.Dispatch<React.SetStateAction<GenerateCorrectiveActionPlanOutput | null>>;
    report: SafetyReport;
    onCloseReport: () => void;
}

function CorrectiveActionPlanResult({ plan, setPlan, report, onCloseReport }: CorrectiveActionPlanResultProps) {
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [isEditingSummary, setIsEditingSummary] = useState(false);
    const [isEditingRootCause, setIsEditingRootCause] = useState(false);
    const { toast } = useToast();
    
    const handleActionChange = <K extends keyof CorrectiveAction>(index: number, field: K, value: CorrectiveAction[K]) => {
        const updatedActions = [...plan.correctiveActions];
        updatedActions[index] = { ...updatedActions[index], [field]: value };
        setPlan(prev => prev ? ({ ...prev, correctiveActions: updatedActions }) : null);
    };

    const handleAddAction = () => {
        const newAction: CorrectiveAction & { id: string } = {
            id: `new-${Date.now()}`,
            action: '',
            responsiblePerson: '',
            deadline: new Date().toISOString().split('T')[0],
            status: 'Not Started',
        };
        setPlan(prev => prev ? ({ ...prev, correctiveActions: [...prev.correctiveActions, newAction] }) : null);
        setEditingActionId(newAction.id);
    };

    const handleRemoveAction = (index: number) => {
        const updatedActions = plan.correctiveActions.filter((_, i) => i !== index);
        setPlan(prev => prev ? ({ ...prev, correctiveActions: updatedActions }) : null);
    };

    const getStatusVariant = (status: string) => {
        switch(status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'warning';
            default: return 'outline';
        }
    };
    
    const allActionsCompleted = plan.correctiveActions.every(action => action.status === 'Completed');

    const ActionRow = ({ action, index }: { action: CorrectiveAction & { id?: string }, index: number }) => {
        const isEditing = editingActionId === action.id;
        
        const handleSave = () => {
             // Basic validation
            if (!action.action || !action.responsiblePerson) {
                toast({ variant: 'destructive', title: 'Error', description: 'Action and Responsible Person cannot be empty.' });
                return;
            }
            setEditingActionId(null);
        };

        return (
            <TableRow>
                <TableCell>
                    {isEditing ? (
                        <Textarea
                            value={action.action}
                            onChange={(e) => handleActionChange(index, 'action', e.target.value)}
                            className="min-h-[60px] text-sm"
                        />
                    ) : (
                        <p className="text-sm">{action.action}</p>
                    )}
                </TableCell>
                <TableCell>
                    {isEditing ? (
                         <Select
                            value={action.responsiblePerson}
                            onValueChange={(value) => handleActionChange(index, 'responsiblePerson', value)}
                        >
                            <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Select Person" />
                            </SelectTrigger>
                            <SelectContent>
                                {report.investigationTeam?.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                       <p className="text-sm">{action.responsiblePerson}</p>
                    )}
                </TableCell>
                 <TableCell>
                    {isEditing ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal text-sm">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(parseISO(action.deadline), "MMM d, yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent>
                                <Calendar
                                    mode="single"
                                    selected={parseISO(action.deadline)}
                                    onSelect={(date) => date && handleActionChange(index, 'deadline', date.toISOString().split('T')[0])}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    ) : (
                         <p className="text-sm">{format(parseISO(action.deadline), "MMM d, yyyy")}</p>
                    )}
                </TableCell>
                <TableCell>
                     {isEditing ? (
                         <Select
                            value={action.status}
                            onValueChange={(value: CorrectiveAction['status']) => handleActionChange(index, 'status', value)}
                        >
                            <SelectTrigger className="text-sm">
                                 <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Not Started">Not Started</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge variant={getStatusVariant(action.status)}>{action.status}</Badge>
                    )}
                </TableCell>
                <TableCell className="text-right no-print">
                    <div className="flex gap-1 justify-end">
                        {isEditing ? (
                            <Button size="icon" onClick={handleSave} variant="ghost"><Save className="h-4 w-4 text-primary" /></Button>
                        ) : (
                            <Button size="icon" onClick={() => setEditingActionId(action.id || null)} variant="ghost" disabled={report.status === 'Closed'}><Edit className="h-4 w-4" /></Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAction(index)} disabled={report.status === 'Closed' || isEditing}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
        )
    };

    return (
        <Fragment>
            <div className="space-y-6">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-base flex items-center gap-2"><FileText /> Summary of Findings</h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingSummary(!isEditingSummary)} className="no-print">
                            {isEditingSummary ? <Save className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                            {isEditingSummary ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                     {isEditingSummary ? (
                        <Textarea
                            value={plan.summaryOfFindings}
                            onChange={(e) => setPlan(prev => prev ? { ...prev, summaryOfFindings: e.target.value } : null)}
                            className="min-h-[100px] text-sm"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{plan.summaryOfFindings}</p>
                    )}
                </div>
                <div>
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-base flex items-center gap-2"><Target /> Root Cause Analysis</h3>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingRootCause(!isEditingRootCause)} className="no-print">
                            {isEditingRootCause ? <Save className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
                            {isEditingRootCause ? 'Save' : 'Edit'}
                        </Button>
                    </div>
                     {isEditingRootCause ? (
                        <Textarea
                            value={plan.rootCause}
                            onChange={(e) => setPlan(prev => prev ? { ...prev, rootCause: e.target.value } : null)}
                            className="min-h-[80px] text-sm"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{plan.rootCause}</p>
                    )}
                </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-base flex items-center gap-2"><Milestone /> Corrective Actions</h3>
                        <Button variant="outline" size="sm" onClick={handleAddAction} disabled={report.status === 'Closed' || editingActionId !== null} className="no-print">
                            <PlusCircleIcon className="mr-2 h-4 w-4" />
                            Add Action
                        </Button>
                    </div>
                    <div className="overflow-x-auto border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Action</TableHead>
                                    <TableHead>Responsible</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right no-print">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plan.correctiveActions.map((action, i) => (
                                    <ActionRow
                                        key={(action as any).id || i}
                                        action={{ id: (action as any).id || `action-${i}`, ...action }}
                                        index={i}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
             {allActionsCompleted && report.status !== 'Closed' && (
                <div className="flex justify-end gap-2 mt-6 no-print">
                    <Button variant="outline">Save Plan</Button>
                    <Button onClick={onCloseReport}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Close &amp; Archive Report
                    </Button>
                </div>
            )}
        </Fragment>
    );
}

const PrintableReport = ({ report, correctiveActionPlan, onUpdate, onPromoteRisk }: { report: SafetyReport, correctiveActionPlan: GenerateCorrectiveActionPlanOutput | null, onUpdate: (report: Partial<SafetyReport>) => void, onPromoteRisk: (risk: RiskRegisterEntry) => void }) => {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>{report.heading}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex justify-between items-start flex-col">
                            <span className="font-semibold text-muted-foreground text-sm">Report #</span>
                            <span className="font-mono">{report.reportNumber}</span>
                        </div>
                        <div className="flex justify-between items-start flex-col">
                            <span className="font-semibold text-muted-foreground text-sm">Status</span>
                            <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                        </div>
                        <div className="flex justify-between items-start flex-col">
                            <span className="font-semibold text-muted-foreground text-sm">Occurrence Date</span>
                            <span>{report.occurrenceDate} {report.occurrenceTime}</span>
                        </div>
                        <div className="flex justify-between items-start flex-col">
                            <span className="font-semibold text-muted-foreground text-sm">Filed Date</span>
                            <span>{report.filedDate}</span>
                        </div>
                        <div className="flex justify-between items-start flex-col">
                            <span className="font-semibold text-muted-foreground text-sm">Submitted By</span>
                            <span>{report.submittedBy}</span>
                        </div>
                        {report.aircraftInvolved && (
                            <div className="flex justify-between items-start flex-col">
                                <span className="font-semibold text-muted-foreground text-sm">Aircraft</span>
                                <span>{report.aircraftInvolved}</span>
                            </div>
                        )}
                        {report.location && (
                            <div className="flex justify-between items-start flex-col">
                                <span className="font-semibold text-muted-foreground text-sm">Location</span>
                                <span>{report.location}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 pt-2">
                        <h4 className="font-semibold">Details</h4>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{report.details}</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 w-full">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="occurrenceCategory">ICAO Occurrence Category</Label>
                            </div>
                            <Input readOnly value={report.occurrenceCategory || 'N/A'} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="phaseOfFlight">Phase of Flight</Label>
                        <Input readOnly value={report.phaseOfFlight || 'N/A'} />
                        </div>
                    </div>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Investigation</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>Investigation Notes &amp; Findings</Label>
                        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md min-h-[150px] whitespace-pre-wrap">{report.investigationNotes || 'No notes entered.'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment &amp; Mitigation</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-6">
                    <InitialRiskAssessment report={report} onUpdate={onUpdate} onPromoteRisk={onPromoteRisk} />
                    <Separator />
                    <MitigatedRiskAssessment 
                        report={report} 
                        onUpdate={onUpdate} 
                        correctiveActions={correctiveActionPlan?.correctiveActions}
                    />
                </CardContent>
            </Card>
            {correctiveActionPlan && (
                <Card>
                  <CardHeader>
                    <CardTitle>Corrective Action Plan</CardTitle>
                  </CardHeader>
                    <CardContent className="pt-0 space-y-6">
                        <CorrectiveActionPlanResult 
                            plan={correctiveActionPlan} 
                            setPlan={() => {}} // dummy function for print
                            report={report} 
                            onCloseReport={() => {}} // dummy
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

function FiveWhysAnalysisResult({ data, onIncorporate }: { data: FiveWhysAnalysisOutput, onIncorporate: (text: string) => void }) {
    const [editableAnalysis, setEditableAnalysis] = useState<FiveWhysAnalysisOutput>(data);

    const handleIncorporate = () => {
        let textToIncorporate = "\n--- 5 WHYS ROOT CAUSE ANALYSIS ---\n\n";
        textToIncorporate += `**Problem Statement:** ${editableAnalysis.problemStatement}\n\n`;
        editableAnalysis.analysis.forEach((item, index) => {
            textToIncorporate += `**Why ${index + 1}:** ${item.why}\n`;
            textToIncorporate += `**Because:** ${item.because}\n\n`;
        });
        textToIncorporate += `**Determined Root Cause:** ${editableAnalysis.rootCause}\n`;
        textToIncorporate += "\n--- END OF 5 WHYS ANALYSIS ---\n";
        onIncorporate(textToIncorporate);
    };

    const handleTextChange = <K extends keyof FiveWhysAnalysisOutput>(field: K, value: string) => {
        setEditableAnalysis(prev => ({ ...prev, [field]: value }));
    };

    const handleAnalysisChange = (index: number, field: 'why' | 'because', value: string) => {
        const newAnalysis = [...editableAnalysis.analysis];
        newAnalysis[index] = { ...newAnalysis[index], [field]: value };
        setEditableAnalysis(prev => ({ ...prev, analysis: newAnalysis }));
    };

    const addWhy = () => {
        const newAnalysis = [...editableAnalysis.analysis, { why: '', because: '' }];
        setEditableAnalysis(prev => ({ ...prev, analysis: newAnalysis }));
    };

    const removeWhy = (index: number) => {
        const newAnalysis = editableAnalysis.analysis.filter((_, i) => i !== index);
        setEditableAnalysis(prev => ({ ...prev, analysis: newAnalysis }));
    };

    return (
        <div className="space-y-4 pt-4">
            <h3 className="font-semibold text-base flex items-center gap-2"><Bot /> Editable 5 Whys Analysis Result</h3>
            <div className="p-4 bg-muted rounded-lg space-y-4">
                <div>
                    <Label className="font-semibold text-sm">Problem Statement</Label>
                    <Textarea
                        value={editableAnalysis.problemStatement}
                        onChange={(e) => handleTextChange('problemStatement', e.target.value)}
                        className="bg-background mt-1"
                    />
                </div>
                <Separator />
                {editableAnalysis.analysis.map((item, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-md bg-background/50 relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeWhy(index)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <div>
                            <Label className="font-semibold text-sm">Why #{index + 1}</Label>
                            <Textarea
                                value={item.why}
                                onChange={(e) => handleAnalysisChange(index, 'why', e.target.value)}
                                placeholder="Ask 'Why?'..."
                                className="bg-background mt-1"
                            />
                        </div>
                        <div>
                            <Label className="font-semibold text-sm">Because...</Label>
                            <Textarea
                                value={item.because}
                                onChange={(e) => handleAnalysisChange(index, 'because', e.target.value)}
                                placeholder="Answer 'Because...'"
                                className="bg-background mt-1"
                            />
                        </div>
                    </div>
                ))}
                 <Button variant="outline" size="sm" onClick={addWhy}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Why
                </Button>
                <Separator />
                 <div>
                    <Label className="font-semibold text-sm">Root Cause</Label>
                    <Textarea
                        value={editableAnalysis.rootCause}
                        onChange={(e) => handleTextChange('rootCause', e.target.value)}
                        className="bg-background mt-1"
                    />
                </div>
            </div>
            <Button onClick={handleIncorporate}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Incorporate into Notes
            </Button>
        </div>
    );
}

function SafetyReportInvestigationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading } = useUser();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const { toast } = useToast();
  
  const [suggestStepsState, suggestStepsFormAction] = useActionState(suggestStepsAction, { message: '', data: null, errors: null });
  const [generatePlanState, generatePlanFormAction] = useActionState(generatePlanAction, { message: '', data: null, errors: null });
  const [fiveWhysState, fiveWhysFormAction] = useActionState(fiveWhysAnalysisAction, { message: '', data: null, errors: null });

  const [correctiveActionPlan, setCorrectiveActionPlan] = useState<GenerateCorrectiveActionPlanOutput | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    
    async function fetchReport() {
        if (!company || !reportId) return;
        setDataLoading(true);
        try {
            const reportRef = doc(db, `companies/${company.id}/safety-reports`, reportId);
            const reportSnap = await getDoc(reportRef);

            if (reportSnap.exists()) {
                const reportData = reportSnap.data() as SafetyReport;
                setReport(reportData);
            } else {
                console.error("No such document!");
                setReport(null);
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch safety report.' });
        } finally {
            setDataLoading(false);
        }
    }
    
    fetchReport();
  }, [reportId, company, user, loading, router, toast]);

  useEffect(() => {
    if (generatePlanState.data && !correctiveActionPlan) {
        const data = generatePlanState.data as GenerateCorrectiveActionPlanOutput;
        const actionsWithIds = data.correctiveActions.map((action, index) => ({...action, id: `action-${index}`}));
        setCorrectiveActionPlan({ ...data, correctiveActions: actionsWithIds as any });
    }
  }, [generatePlanState.data, correctiveActionPlan]);

  const handleReportUpdate = (updatedReportData: Partial<SafetyReport>) => {
    setReport(prev => {
        if (!prev) return null;
        const newReport = { ...prev, ...updatedReportData };
        
        if (company) {
            const reportRef = doc(db, `companies/${company.id}/safety-reports`, newReport.id);
            updateDoc(reportRef, newReport as any).catch(error => {
                console.error("Error updating report:", error);
                toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save changes to the database.'});
            });
        }
        
        return newReport;
    });
  };
  
  const handlePromoteRisk = (newRisk: RiskRegisterEntry) => {
     toast({
        title: 'Risk Promoted to Central Register',
        description: `"${newRisk.description}" is now being tracked centrally. You can view it on the main Safety page.`,
    });
  };

  const handleCloseReport = () => {
    if (report) {
      handleReportUpdate({ status: 'Closed' as SafetyReport['status'] });
      toast({
        title: "Report Closed",
        description: `Report ${report.reportNumber} has been successfully closed and archived.`
      });
    }
  };
  
  useEffect(() => {
    if (suggestStepsState.message && suggestStepsState.message !== 'Invalid form data' && suggestStepsState.message !== 'Analysis complete') {
      toast({ variant: 'destructive', title: 'Error', description: suggestStepsState.message });
    }
  }, [suggestStepsState, toast]);

  useEffect(() => {
    if (generatePlanState.message && generatePlanState.message !== 'Invalid form data' && generatePlanState.message !== 'Plan generated') {
        toast({ variant: 'destructive', title: 'Error', description: generatePlanState.message });
    }
  }, [generatePlanState.message, toast]);

  useEffect(() => {
    if (fiveWhysState.message && fiveWhysState.message !== 'Invalid form data' && fiveWhysState.message !== '5 Whys analysis complete.') {
        toast({ variant: 'destructive', title: 'Error', description: fiveWhysState.message });
    }
  }, [fiveWhysState, toast]);


  if (loading || dataLoading) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>Loading report...</p>
        </main>
    );
  }


  if (!report) {
    return (
        <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
          <p>The requested safety report could not be found.</p>
        </main>
    );
  }

  const handleIncorporateSuggestions = (text: string) => {
      const updatedNotes = (report.investigationNotes || '') + '\n' + text;
      handleReportUpdate({ investigationNotes: updatedNotes });
      toast({
          title: "Suggestions Incorporated",
          description: "The AI suggestions have been added to your investigation notes."
      });
  };
  
  const generateMailtoLink = () => {
    if (!report) return "";

    const subject = `Safety Report: ${report.reportNumber} - ${report.heading}`;
    let body = `A safety report requires your attention.\n\n`;
    body += `Report Number: ${report.reportNumber}\n`;
    body += `Heading: ${report.heading}\n`;
    body += `Status: ${report.status}\n`;
    body += `Date of Occurrence: ${report.occurrenceDate}\n\n`;
    body += `Details:\n${report.details}\n\n`;
    if (report.investigationNotes) {
        body += `Investigation Notes:\n${report.investigationNotes}\n\n`;
    }
    body += `Link to report: ${window.location.href}`;

    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const headerContent = (
    <>
        <Button asChild variant="outline" className="no-print">
            <Link href="/safety?tab=reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Reports
            </Link>
        </Button>
        <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.print()} className="no-print">
                <Printer className="mr-2 h-4 w-4" />
                Print Report
            </Button>
            <a href={generateMailtoLink()}>
                 <Button variant="outline" className="no-print">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Report
                </Button>
            </a>
        </div>
    </>
  );

  return (
    <>
      <main className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto">
        <div className="no-print">
            <Accordion type="single" collapsible defaultValue="step-1" className="w-full space-y-4">
                <AccordionItem value="step-1">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 1: Triage &amp; Classification</CardTitle>
                                <CardDescription>Review and classify the initial report details.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            <div className="space-y-4">
                               <div className="space-y-2">
                                    <h4 className="font-semibold">{report.heading}</h4>
                               </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="flex justify-between items-start flex-col">
                                        <span className="font-semibold text-muted-foreground text-sm">Report #</span>
                                        <span className="font-mono">{report.reportNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-start flex-col">
                                        <span className="font-semibold text-muted-foreground text-sm">Status</span>
                                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                                    </div>
                                    <div className="flex justify-between items-start flex-col">
                                        <span className="font-semibold text-muted-foreground text-sm">Occurrence Date</span>
                                        <span>{report.occurrenceDate} {report.occurrenceTime}</span>
                                    </div>
                                        <div className="flex justify-between items-start flex-col">
                                        <span className="font-semibold text-muted-foreground text-sm">Filed Date</span>
                                        <span>{report.filedDate}</span>
                                    </div>
                                        <div className="flex justify-between items-start flex-col">
                                        <span className="font-semibold text-muted-foreground text-sm">Submitted By</span>
                                        <span>{report.submittedBy}</span>
                                    </div>
                                    {report.aircraftInvolved && (
                                        <div className="flex justify-between items-start flex-col">
                                            <span className="font-semibold text-muted-foreground text-sm">Aircraft</span>
                                            <span>{report.aircraftInvolved}</span>
                                        </div>
                                    )}
                                    {report.location && (
                                        <div className="flex justify-between items-start flex-col">
                                            <span className="font-semibold text-muted-foreground text-sm">Location</span>
                                            <span>{report.location}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 pt-2">
                                    <h4 className="font-semibold">Details</h4>
                                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{report.details}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 w-full pt-4 border-t">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="occurrenceCategory">ICAO Occurrence Category</Label>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 no-print">
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs md:max-w-md" align="start">
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-2">
                                                            {Object.entries(ICAO_CODE_DEFINITIONS).map(([code, definition]) => (
                                                                <div key={code} className="text-xs">
                                                                    <span className="font-bold">{code}:</span> {definition}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                        <Select 
                                        name="occurrenceCategory" 
                                        defaultValue={report.occurrenceCategory}
                                        onValueChange={(value) => handleReportUpdate({ occurrenceCategory: value })}
                                        >
                                            <SelectTrigger id="occurrenceCategory">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ICAO_OCCURRENCE_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                    <Label htmlFor="phaseOfFlight">Phase of Flight</Label>
                                    <Select 
                                        name="phaseOfFlight" 
                                        defaultValue={report.phaseOfFlight}
                                        onValueChange={(value) => handleReportUpdate({ phaseOfFlight: value })}
                                    >
                                        <SelectTrigger id="phaseOfFlight">
                                            <SelectValue placeholder="Select Phase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICAO_PHASES_OF_FLIGHT.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                 <AccordionItem value="step-2">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 2: Initial Risk Assessment</CardTitle>
                                <CardDescription>Identify hazards and assess their initial risk level before mitigation.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            <InitialRiskAssessment report={report} onUpdate={handleReportUpdate} onPromoteRisk={handlePromoteRisk} />
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="step-3">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 3: AI Analysis Tools</CardTitle>
                                <CardDescription>Use generative AI to assist with root cause analysis and planning.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                             <Separator className="mb-6"/>
                             <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 p-4 border rounded-lg">
                                        <h3 className="font-semibold flex items-center gap-2"><Lightbulb/> Suggest Steps</h3>
                                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                                            Get AI suggestions for how to proceed with the investigation.
                                        </p>
                                        <form action={suggestStepsFormAction}>
                                            <input type="hidden" name="report" value={JSON.stringify(report)} />
                                            <SuggestStepsButton />
                                        </form>
                                    </div>
                                    <div className="flex-1 p-4 border rounded-lg">
                                        <h3 className="font-semibold flex items-center gap-2"><Target/> 5 Whys Analysis</h3>
                                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                                            Perform a root cause analysis to understand the core issue.
                                        </p>
                                         <form action={fiveWhysFormAction}>
                                            <input type="hidden" name="report" value={JSON.stringify(report)} />
                                            <FiveWhysButton />
                                        </form>
                                    </div>
                                </div>
                                {suggestStepsState.data && <InvestigationAnalysisResult data={suggestStepsState.data as SuggestInvestigationStepsOutput} onIncorporate={handleIncorporateSuggestions} />}
                                {fiveWhysState.data && (
                                    <FiveWhysAnalysisResult data={fiveWhysState.data as FiveWhysAnalysisOutput} onIncorporate={handleIncorporateSuggestions} />
                                )}
                             </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="step-4">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 4: Investigation Workbench</CardTitle>
                                <CardDescription>Form a team, discuss findings, and document the investigation process.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            <div className="space-y-6">
                                <InvestigationTeamForm report={report} onUpdate={handleReportUpdate} />
                                <Separator />
                                <DiscussionSection report={report} onUpdate={handleReportUpdate} />
                                <Separator />
                                <div className="space-y-2">
                                    <Label htmlFor="investigationNotes">Investigation Notes &amp; Findings</Label>
                                    <Textarea
                                        id="investigationNotes"
                                        name="investigationNotes"
                                        placeholder="Add your investigation notes, findings, and root cause analysis here..."
                                        className="min-h-[150px]"
                                        value={report.investigationNotes || ''}
                                        onChange={(e) => handleReportUpdate({ investigationNotes: e.target.value })}
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="step-5">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 5: Residual Risk</CardTitle>
                                <CardDescription>Assess the effectiveness of corrective actions by measuring the residual risk.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            <MitigatedRiskAssessment 
                                report={report} 
                                onUpdate={handleReportUpdate}
                                correctiveActions={correctiveActionPlan?.correctiveActions}
                            />
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                <AccordionItem value="step-6">
                    <Card>
                        <AccordionTrigger className="p-6">
                           <div className="text-left">
                                <CardTitle>Step 6: Corrective Action Plan</CardTitle>
                                <CardDescription>Generate, finalize, and track the plan to prevent recurrence.</CardDescription>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <Separator className="mb-6"/>
                            {correctiveActionPlan ? (
                                <CorrectiveActionPlanResult 
                                    plan={correctiveActionPlan} 
                                    setPlan={setCorrectiveActionPlan}
                                    report={report} 
                                    onCloseReport={handleCloseReport} 
                                />
                            ) : (
                                <div className="space-y-4 text-center">
                                    <p className="text-muted-foreground">
                                        No action plan has been generated yet. Use the AI Assistant to create one.
                                    </p>
                                     <form action={generatePlanFormAction}>
                                        <input type="hidden" name="report" value={JSON.stringify(report)} />
                                        <GeneratePlanButton />
                                    </form>
                                </div>
                            )}
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
        </div>

        <div className="hidden print:block">
            <PrintableReport 
                report={report} 
                correctiveActionPlan={correctiveActionPlan} 
                onUpdate={handleReportUpdate} 
                onPromoteRisk={handlePromoteRisk} 
            />
        </div>

      </main>
    </>
  );
}

SafetyReportInvestigationPage.title = "Safety Report Investigation";
export default SafetyReportInvestigationPage;

    
