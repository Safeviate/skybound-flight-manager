

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, RiskLikelihood, RiskSeverity, MocRisk, MocMitigation } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Edit, Wind, Printer, Bot, Loader2, ChevronDown, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { analyzeMoc } from '@/ai/flows/analyze-moc-flow';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { RiskAssessmentTool } from '../../[reportId]/risk-assessment-tool';

const probabilityOptions: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityOptions: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];

const getAlphanumericCode = (likelihood: RiskLikelihood, severity: RiskSeverity): string => {
    const likelihoodMap: Record<RiskLikelihood, number> = { 'Frequent': 5, 'Occasional': 4, 'Remote': 3, 'Improbable': 2, 'Extremely Improbable': 1 };
    const severityMap: Record<RiskSeverity, string> = { 'Catastrophic': 'A', 'Hazardous': 'B', 'Major': 'C', 'Minor': 'D', 'Negligible': 'E' };
    if (!likelihood || !severity) return 'N/A';
    return `${likelihoodMap[likelihood]}${severityMap[severity]}`;
};

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1 print:break-inside-avoid">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
);

type DialogState = 
    | { type: 'addPhase' }
    | { type: 'editPhase'; data: { phaseId: string; description: string } }
    | { type: 'addStep'; data: { phaseId: string } }
    | { type: 'editStep'; data: { phaseId: string; stepId: string; description: string } }
    | { type: 'addHazard'; data: { phaseId: string; stepId: string } }
    | { type: 'editHazard'; data: { phaseId: string; stepId: string; hazardId: string; description: string } }
    | { type: 'addRisk'; data: { phaseId: string; stepId: string; hazardId: string } }
    | { type: 'editRisk'; data: { phaseId: string; stepId: string; hazardId: string; risk: MocRisk } }
    | { type: 'addMitigation'; data: { phaseId: string; stepId: string; hazardId: string; riskId: string } }
    | { type: 'editMitigation'; data: { phaseId: string; stepId: string; hazardId: string; riskId: string; mitigation: MocMitigation } }
    | null;


export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const mocId = params.mocId as string;
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisParams, setAnalysisParams] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>(null);
  
  const canEdit = useMemo(() => user?.permissions.includes('MOC:Edit') || user?.permissions.includes('Super User'), [user]);

  const fetchMoc = useCallback(async () => {
    if (!mocId || !company) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const mocRef = doc(db, `companies/${company.id}/management-of-change`, mocId);
      const mocSnap = await getDoc(mocRef);

      if (mocSnap.exists()) {
        setMoc({ id: mocSnap.id, ...mocSnap.data() } as ManagementOfChange);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Management of Change record not found.' });
        setMoc(null);
      }
    } catch (error) {
      console.error("Error fetching MOC details:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch MOC details.' });
    } finally {
      setLoading(false);
    }
  }, [mocId, company, toast]);
  
  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMoc();
  }, [mocId, user, userLoading, router, fetchMoc]);

  const handleUpdate = async (updatedData: Partial<ManagementOfChange>, showToast = true) => {
    if (!moc || !company) return;
    const mocRef = doc(db, `companies/${company.id}/management-of-change`, moc.id);
    try {
      const newMocState = { ...moc, ...updatedData };
      await updateDoc(mocRef, JSON.parse(JSON.stringify(updatedData)));
      setMoc(newMocState);
      if (showToast) {
          toast({ title: 'MOC Updated', description: 'Your changes have been saved.' });
      }
    } catch (error) {
      console.error("Error updating MOC:", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to MOC.' });
    }
  };
  
  const handleAnalyzeWithAi = async () => {
    if (!moc) return;
    setIsAiLoading(true);
    try {
      const result = await analyzeMoc({
        title: moc.title,
        description: moc.description,
        reason: moc.reason,
        scope: moc.scope,
        analysisParameters: analysisParams,
      });

      const newPhases: MocPhase[] = result.phases.map(phase => ({
        id: `phase-${Date.now()}-${Math.random()}`,
        description: phase.description,
        steps: phase.steps.map(step => ({
          id: `step-${Date.now()}-${Math.random()}`,
          description: step.description,
          hazards: step.hazards.map(hazard => ({
            id: `hazard-${Date.now()}-${Math.random()}`,
            description: hazard.description,
            risks: hazard.risks.map(risk => ({
              id: `risk-${Date.now()}-${Math.random()}`,
              description: risk.description,
              likelihood: risk.likelihood,
              severity: risk.severity,
              riskScore: getRiskScore(risk.likelihood, risk.severity),
              mitigations: [],
            })),
          })),
        }))
      }));

      handleUpdate({ phases: newPhases }, true);
      toast({ title: 'AI Analysis Complete', description: 'Suggested implementation plan has been populated.' });
    } catch (error) {
      console.error("AI Analysis Error:", error);
      toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not generate an implementation plan.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDialogSubmit = (formData: any) => {
    if (!moc || !dialogState) return;

    let updatedPhases = [...(moc.phases || [])];
    const { type, data } = dialogState as any; // Cast to any to access data property without checking type
    
    if (type === 'addPhase') {
        const newPhase: MocPhase = { id: `phase-${Date.now()}`, description: formData.description, steps: [] };
        updatedPhases.push(newPhase);
    } else if (type === 'editPhase') {
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, description: formData.description } : p);
    } else if (type === 'addStep') {
        const newStep: MocStep = { id: `step-${Date.now()}`, description: formData.description, hazards: [] };
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: [...(p.steps || []), newStep] } : p);
    } else if (type === 'editStep') {
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, description: formData.description } : s) } : p);
    } else if (type === 'addHazard') {
        const newHazard: MocHazard = { id: `hazard-${Date.now()}`, description: formData.description, risks: [] };
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: [...(s.hazards || []), newHazard] } : s) } : p);
    } else if (type === 'editHazard') {
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, description: formData.description } : h) } : s) } : p);
    } else if (type === 'addRisk') {
        const newRisk: MocRisk = { ...formData, id: `risk-${Date.now()}`, riskScore: getRiskScore(formData.likelihood, formData.severity), mitigations: [] };
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, risks: [...(h.risks || []), newRisk] } : h) } : s) } : p);
    } else if (type === 'editRisk') {
        const riskScore = getRiskScore(formData.likelihood, formData.severity);
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, risks: h.risks?.map(r => r.id === data.risk.id ? { ...r, ...formData, riskScore } : r) } : h) } : s) } : p);
    } else if (type === 'addMitigation') {
        const newMitigation: MocMitigation = { ...formData, id: `mitigation-${Date.now()}`, residualRiskScore: getRiskScore(formData.residualLikelihood, formData.residualSeverity) };
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, risks: h.risks?.map(r => r.id === data.riskId ? { ...r, mitigations: [...(r.mitigations || []), newMitigation] } : r) } : h) } : s) } : p);
    } else if (type === 'editMitigation') {
        const residualRiskScore = getRiskScore(formData.residualLikelihood, formData.residualSeverity);
        updatedPhases = updatedPhases.map(p => p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => s.id === data.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, risks: h.risks?.map(r => r.id === data.riskId ? { ...r, mitigations: r.mitigations?.map(m => m.id === data.mitigation.id ? { ...m, ...formData, residualRiskScore } : m) } : r) } : h) } : s) } : p);
    }

    handleUpdate({ phases: updatedPhases });
    setDialogState(null);
  };
  
  const handleDelete = (itemType: string, ids: Record<string, string>) => {
    if (!moc) return;
    let updatedPhases = JSON.parse(JSON.stringify(moc.phases || []));

    if (itemType === 'phase') {
        updatedPhases = updatedPhases.filter((p: MocPhase) => p.id !== ids.phaseId);
    } else if (itemType === 'step') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === ids.phaseId ? { ...p, steps: p.steps?.filter(s => s.id !== ids.stepId) } : p);
    } else if (itemType === 'hazard') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === ids.phaseId ? { ...p, steps: p.steps?.map(s => s.id === ids.stepId ? { ...s, hazards: s.hazards?.filter(h => h.id !== ids.hazardId) } : s) } : p);
    } else if (itemType === 'risk') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === ids.phaseId ? { ...p, steps: p.steps?.map(s => s.id === ids.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === ids.hazardId ? { ...h, risks: h.risks?.filter(r => r.id !== ids.riskId) } : h) } : s) } : p);
    } else if (itemType === 'mitigation') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === ids.phaseId ? { ...p, steps: p.steps?.map(s => s.id === ids.stepId ? { ...s, hazards: s.hazards?.map(h => h.id === data.hazardId ? { ...h, risks: h.risks?.map(r => r.id === data.riskId ? { ...r, mitigations: r.mitigations?.filter(m => m.id !== ids.mitigationId) } : r) } : h) } : s) } : p);
    }

    handleUpdate({ phases: updatedPhases });
    toast({ title: 'Item Deleted', description: 'The selected item has been removed.' });
  };


  if (loading || userLoading) return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>Loading MOC details...</p></main>;
  if (!moc) return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>The requested Management of Change record could not be found.</p></main>;

  return (
    <main className="flex-1 p-4 md:p-8 print:p-0">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between no-print">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to MOC List
            </Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
        </div>
        
        <Card className="print:shadow-none print:border-none">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">{company?.logoUrl && <Image src={company.logoUrl} alt={`${company.name} Logo`} width={80} height={80} className="h-20 w-20 rounded-md object-contain" />}</div>
                    <div className="flex-1 text-center"><CardTitle>{company?.name}</CardTitle><CardDescription>Management of Change</CardDescription></div>
                    <div className="w-16 flex justify-end"><Badge>{moc.status}</Badge></div>
                </div>
                <Separator className="my-4"/>
                <div><CardTitle className="mt-2">{moc.mocNumber}: {moc.title}</CardTitle><CardDescription>Proposed by {moc.proposedBy} on {format(parseISO(moc.proposalDate), 'MMMM d, yyyy')}</CardDescription></div>
            </CardHeader>
            <CardContent className="space-y-6">
                <DetailSection title="Description of Change"><p className="whitespace-pre-wrap">{moc.description}</p></DetailSection>
                <DetailSection title="Reason for Change"><p className="whitespace-pre-wrap">{moc.reason}</p></DetailSection>
                <DetailSection title="Scope of Change"><p className="whitespace-pre-wrap">{moc.scope}</p></DetailSection>
                
                <Separator className="my-6 print:my-4" />
                
                <Card className="print:shadow-none print:border-none">
                    <CardHeader>
                        <CardTitle>Hazard Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RiskAssessmentTool />
                    </CardContent>
                </Card>

                <div>
                    <h2 className="text-xl font-bold mb-4">Implementation Plan & Hazard Analysis</h2>
                    <div className="space-y-4 rounded-lg border p-4 no-print">
                        {canEdit && (<>
                            <Label htmlFor="analysis-params">AI Analysis Parameters (Optional)</Label>
                            <Textarea id="analysis-params" placeholder="Enter specific keywords for the AI to focus on, e.g., 'impact on flight crew duty times'..." value={analysisParams} onChange={(e) => setAnalysisParams(e.target.value)}/>
                            <div className="flex items-center gap-2 justify-end">
                                <Button variant="secondary" onClick={handleAnalyzeWithAi} disabled={isAiLoading}>{isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />} Analyze with AI</Button>
                            </div>
                        </>)}
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                     {moc.phases?.map((phase, phaseIndex) => (
                        <div key={phase.id} className="pt-4 border-t-2 border-primary moc-print-phase-wrapper">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">{phaseIndex + 1}. {phase.description}</h3>
                                {canEdit && <div className="flex items-center gap-2 no-print">
                                        <Button variant="ghost" size="icon" onClick={() => setDialogState({ type: 'editPhase', data: { phaseId: phase.id, description: phase.description }})}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete('phase', { phaseId: phase.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>}
                            </div>
                            <div className="pl-2 space-y-4">
                                {phase.steps?.map((step, stepIndex) => (
                                    <Card key={step.id} className="print:shadow-none print:border-none">
                                        <CardHeader className="p-4">
                                             <div className="flex items-center gap-2"><p className="font-semibold">Step {phaseIndex + 1}.{stepIndex + 1}: {step.description}</p>
                                                {canEdit && <div className="flex items-center gap-1 no-print">
                                                    <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editStep', data: { phaseId: phase.id, stepId: step.id, description: step.description }})}><Edit className="h-3 w-3" /></Button>
                                                    <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('step', { phaseId: phase.id, stepId: step.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                </div>}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-3">
                                             {step.hazards?.map(hazard => (
                                                <div key={hazard.id} className="p-3 bg-muted/50 rounded-md border">
                                                    <div className="flex items-center gap-2"><p className="font-semibold text-sm">Hazard: {hazard.description}</p>
                                                        {canEdit && <div className="flex items-center gap-1 no-print">
                                                            <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editHazard', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, description: hazard.description }})}><Edit className="h-3 w-3" /></Button>
                                                            <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('hazard', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                        </div>}
                                                    </div>
                                                    {hazard.risks?.map(risk => (
                                                    <div key={risk.id} className="pl-4 pt-2 mt-2 border-t">
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-2"><p className="font-semibold text-sm">Risk: {risk.description}</p>
                                                                {canEdit && <div className="flex items-center gap-1 no-print">
                                                                    <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editRisk', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, risk } })}><Edit className="h-3 w-3" /></Button>
                                                                    <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('risk', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                                </div>}
                                                            </div>
                                                            <Badge className="font-mono print-force-color" style={{ backgroundColor: getRiskScoreColor(risk.likelihood, risk.severity, company?.riskMatrixColors), color: 'black' }}>{getAlphanumericCode(risk.likelihood, risk.severity)}</Badge>
                                                        </div>
                                                        {risk.mitigations?.map(mit => (
                                                        <div key={mit.id} className="pl-8 pt-2 mt-2 border-t border-dashed">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-2"><p className="font-semibold text-sm">Mitigation: {mit.description}</p>
                                                                    {canEdit && <div className="flex items-center gap-1 no-print">
                                                                        <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editMitigation', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id, mitigation: mit } })}><Edit className="h-3 w-3" /></Button>
                                                                        <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('mitigation', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id, mitigationId: mit.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                                    </div>}
                                                                </div>
                                                                <Badge className="font-mono print-force-color" style={{backgroundColor: getRiskScoreColor(mit.residualLikelihood, mit.residualSeverity, company?.riskMatrixColors), color: 'black'}}>{getAlphanumericCode(mit.residualLikelihood, mit.residualSeverity)}</Badge>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                {mit.responsiblePerson && <span>Owner: {mit.responsiblePerson}</span>}
                                                                {mit.completionDate && <span className="ml-4">Due: {format(parseISO(mit.completionDate), 'PPP')}</span>}
                                                            </div>
                                                        </div>
                                                        ))}
                                                        {canEdit && <Button variant="outline" size="sm" className="mt-2 no-print" onClick={() => setDialogState({ type: 'addMitigation', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id }})}>Add Mitigation</Button>}
                                                    </div>
                                                    ))}
                                                    {canEdit && <div className="flex gap-2 mt-2 no-print">
                                                        <Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'addRisk', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id }})}>Add Risk</Button>
                                                    </div>}
                                                </div>
                                            ))}
                                            {canEdit && <div className="flex gap-2 mt-2 no-print"><Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'addHazard', data: { phaseId: phase.id, stepId: step.id }})}>Add Hazard</Button></div>}
                                        </CardContent>
                                    </Card>
                                ))}
                                {canEdit && <div className="flex justify-end mt-2 no-print"><Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'addStep', data: { phaseId: phase.id }})}>Add Step</Button></div>}
                            </div>
                        </div>
                    ))}
                    {canEdit && (
                        <div className="pt-4 border-t no-print">
                            <Button variant="secondary" className="w-full" onClick={() => setDialogState({ type: 'addPhase' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Phase
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

       <Dialog open={dialogState !== null} onOpenChange={() => setDialogState(null)}>
            <DialogContent>
                <DialogHeader><DialogTitle>{dialogState?.type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</DialogTitle></DialogHeader>
                {dialogState?.type === 'addPhase' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter phase description..." />}
                {dialogState?.type === 'editPhase' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter phase description..." initialValue={dialogState.data.description} />}
                {dialogState?.type === 'addStep' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter step description..." />}
                {dialogState?.type === 'editStep' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter step description..." initialValue={dialogState.data.description} />}
                {dialogState?.type === 'addHazard' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter hazard description..." />}
                {dialogState?.type === 'editHazard' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Enter hazard description..." initialValue={dialogState.data.description} />}
                {dialogState?.type === 'addRisk' && <RiskForm onSubmit={handleDialogSubmit} />}
                {dialogState?.type === 'editRisk' && <RiskForm onSubmit={handleDialogSubmit} risk={dialogState.data.risk} />}
                {dialogState?.type === 'addMitigation' && <MitigationForm onSubmit={handleDialogSubmit} />}
                {dialogState?.type === 'editMitigation' && <MitigationForm onSubmit={handleDialogSubmit} mitigation={dialogState.data.mitigation} />}
            </DialogContent>
        </Dialog>
    </main>
  );
}

const TextareaForm = ({ onSubmit, placeholder, initialValue = '' }: { onSubmit: (data: { description: string }) => void, placeholder: string, initialValue?: string }) => {
    const [description, setDescription] = useState(initialValue);
    return (<div className="space-y-4 py-4"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={placeholder} /><DialogFooter><Button onClick={() => onSubmit({ description })} disabled={!description.trim()}>Save</Button></DialogFooter></div>);
};

const riskFormSchema = z.object({ description: z.string().min(1, 'Description is required'), likelihood: z.enum(probabilityOptions), severity: z.enum(severityOptions) });
const RiskForm = ({ onSubmit, risk }: { onSubmit: (data: any) => void, risk?: MocRisk }) => {
    const form = useForm<z.infer<typeof riskFormSchema>>({ resolver: zodResolver(riskFormSchema), defaultValues: risk });
    return (<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4"><FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormControl><Textarea placeholder="Describe the risk..." {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="likelihood" render={({ field }) => (<FormItem><FormLabel>Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Likelihood" /></SelectTrigger><SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="severity" render={({ field }) => (<FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Severity" /></SelectTrigger><SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /></div><DialogFooter><Button type="submit">Save Risk</Button></DialogFooter></form></Form>);
};

const mitigationFormSchema = z.object({ description: z.string().min(1, 'Description is required'), residualLikelihood: z.enum(probabilityOptions), residualSeverity: z.enum(severityOptions), responsiblePerson: z.string().optional(), completionDate: z.date().optional() });
const MitigationForm = ({ onSubmit, mitigation }: { onSubmit: (data: any) => void, mitigation?: MocMitigation }) => {
    const form = useForm<z.infer<typeof mitigationFormSchema>>({ resolver: zodResolver(mitigationFormSchema), defaultValues: mitigation ? { ...mitigation, completionDate: mitigation.completionDate ? parseISO(mitigation.completionDate) : undefined } : { responsiblePerson: '' } });
    return (<Form {...form}><form onSubmit={form.handleSubmit((data) => onSubmit({...data, completionDate: data.completionDate ? format(data.completionDate, 'yyyy-MM-dd') : undefined }))} className="space-y-4 py-4"><FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Mitigation Action</FormLabel><FormControl><Textarea placeholder="Describe the mitigation..." {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="residualLikelihood" render={({ field }) => (<FormItem><FormLabel>Residual Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Likelihood" /></SelectTrigger><SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="residualSeverity" render={({ field }) => (<FormItem><FormLabel>Residual Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Severity" /></SelectTrigger><SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /></div><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="responsiblePerson" render={({ field }) => (<FormItem><FormLabel>Responsible Person</FormLabel><FormControl><Input placeholder="e.g., Safety Manager" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="completionDate" render={({ field }) => (<FormItem><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} /></div><DialogFooter><Button type="submit">Save Mitigation</Button></DialogFooter></form></Form>);
};

MocDetailPage.title = "Management of Change";
