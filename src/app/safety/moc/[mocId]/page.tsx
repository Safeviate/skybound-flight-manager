
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Image from 'next/image';


const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1 print:break-inside-avoid">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
);

const probabilityOptions: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityOptions: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];


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
  
  // State for inline editing
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingPhaseText, setEditingPhaseText] = useState('');

  // State for dialogs
  const [dialogState, setDialogState] = useState<{
      type: 'addStep' | 'addHazard' | 'editRisk' | 'editMitigation' | null;
      data: any;
  }>({ type: null, data: null });

  
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
      await updateDoc(mocRef, updatedData);
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

  const handlePhaseUpdate = (phaseId: string, newDescription: string) => {
    if (!moc) return;
    const updatedPhases = moc.phases?.map(p =>
      p.id === phaseId ? { ...p, description: newDescription } : p
    );
    handleUpdate({ phases: updatedPhases });
    setEditingPhaseId(null);
  };
  
  const startEditingPhase = (phase: MocPhase) => {
    setEditingPhaseId(phase.id);
    setEditingPhaseText(phase.description);
  };
  
  const handleDeletePhase = (phaseId: string) => {
    if (!moc) return;
    const updatedPhases = moc.phases?.filter(p => p.id !== phaseId);
    handleUpdate({ phases: updatedPhases });
    toast({ title: 'Phase Deleted', description: 'The implementation phase has been removed.' });
  }

  const handleDialogSubmit = (formData: any) => {
    if (!moc) return;

    const { type, data } = dialogState;
    let updatedPhases = [...(moc.phases || [])];
    
    switch (type) {
        case 'addStep': {
            const { phaseId } = data;
            const newStep: MocStep = { id: `step-${Date.now()}`, description: formData.description, hazards: [] };
            updatedPhases = updatedPhases.map(p => p.id === phaseId ? { ...p, steps: [...(p.steps || []), newStep] } : p);
            break;
        }
        case 'addHazard': {
            const { phaseId, stepId } = data;
            const newHazard: MocHazard = { id: `hazard-${Date.now()}`, description: formData.description, risks: [] };
            updatedPhases = updatedPhases.map(p => p.id === phaseId ? {
                ...p,
                steps: p.steps?.map(s => s.id === stepId ? { ...s, hazards: [...(s.hazards || []), newHazard] } : s)
            } : p);
            break;
        }
        case 'editRisk': {
            const { phaseId, stepId, hazardId, riskId } = data;
             const riskScore = getRiskScore(formData.likelihood, formData.severity);
            updatedPhases = updatedPhases.map(p => p.id === phaseId ? {
                ...p,
                steps: p.steps?.map(s => s.id === stepId ? {
                    ...s,
                    hazards: s.hazards?.map(h => h.id === hazardId ? {
                        ...h,
                        risks: h.risks?.map(r => r.id === riskId ? { ...r, ...formData, riskScore } : r)
                    } : h)
                } : s)
            } : p);
            break;
        }
        default:
            break;
    }
    
    handleUpdate({ phases: updatedPhases });
    setDialogState({ type: null, data: null });
  };
  
  const severityMap: Record<RiskSeverity, string> = { 'Catastrophic': 'A', 'Hazardous': 'B', 'Major': 'C', 'Minor': 'D', 'Negligible': 'E' };
  const likelihoodMap: Record<RiskLikelihood, number> = { 'Frequent': 5, 'Occasional': 4, 'Remote': 3, 'Improbable': 2, 'Extremely Improbable': 1 };

  const getAlphanumericCode = (likelihood: RiskLikelihood, severity: RiskSeverity): string => {
    if (!likelihood || !severity) return 'N/A';
    return `${likelihoodMap[likelihood]}${severityMap[severity]}`;
  };


  if (loading || userLoading) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>Loading MOC details...</p>
      </main>
    );
  }

  if (!moc) {
    return (
      <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
        <p>The requested Management of Change record could not be found.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-8 print:p-0">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between no-print">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to MOC List
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
        </div>
        
        <Card className="print:shadow-none print:border-none">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        {company?.logoUrl && (
                            <Image
                                src={company.logoUrl}
                                alt={`${company.name} Logo`}
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-md object-contain"
                            />
                        )}
                    </div>
                    <div className="flex-1 text-center">
                        <CardTitle>{company?.name}</CardTitle>
                        <CardDescription>Management of Change</CardDescription>
                    </div>
                    <div className="w-16 flex justify-end">
                        <Badge>{moc.status}</Badge>
                    </div>
                </div>
                <Separator className="my-4"/>
                <div>
                    <CardTitle className="mt-2">{moc.mocNumber}: {moc.title}</CardTitle>
                    <CardDescription>
                        Proposed by {moc.proposedBy} on {format(parseISO(moc.proposalDate), 'MMMM d, yyyy')}
                    </CardDescription>
                </div>
            </CardHeader>
          <CardContent className="space-y-6">
             <DetailSection title="Description of Change">
                <p className="whitespace-pre-wrap">{moc.description}</p>
             </DetailSection>
             <DetailSection title="Reason for Change">
                <p className="whitespace-pre-wrap">{moc.reason}</p>
             </DetailSection>
             <DetailSection title="Scope of Change">
                <p className="whitespace-pre-wrap">{moc.scope}</p>
             </DetailSection>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-none">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Implementation Plan & Hazard Analysis</CardTitle>
                        <CardDescription>
                            Outline the phases and steps to implement the change, and identify associated hazards.
                        </CardDescription>
                    </div>
                </div>
                <div className="space-y-4 rounded-lg border p-4 no-print mt-4">
                    {canEdit && (
                        <>
                            <Label htmlFor="analysis-params">AI Analysis Parameters (Optional)</Label>
                            <Textarea 
                                id="analysis-params"
                                placeholder="Enter specific keywords or areas for the AI to focus on, e.g., 'impact on flight crew duty times' or 'required maintenance tooling'."
                                value={analysisParams}
                                onChange={(e) => setAnalysisParams(e.target.value)}
                            />
                            <div className="flex items-center gap-2 justify-end">
                                <Button variant="secondary" onClick={handleAnalyzeWithAi} disabled={isAiLoading}>
                                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                    Analyze with AI
                                </Button>
                                 <Button variant="outline" onClick={() => { /* Open add phase dialog */ }}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Phase
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {moc.phases && moc.phases.length > 0 ? (
                    moc.phases.map((phase, phaseIndex) => (
                        <div key={phase.id} className="space-y-4 print:break-inside-avoid border-l-4 pl-4 border-primary/20">
                             <div className="flex justify-between items-center py-2">
                                {editingPhaseId === phase.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <Input value={editingPhaseText} onChange={(e) => setEditingPhaseText(e.target.value)} className="text-lg font-semibold" />
                                        <Button size="icon" onClick={() => handlePhaseUpdate(phase.id, editingPhaseText)}><Save className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => setEditingPhaseId(null)}>X</Button>
                                    </div>
                                ) : (
                                    <h3 className="text-lg font-semibold">{phaseIndex + 1}. {phase.description}</h3>
                                )}
                                {canEdit && editingPhaseId !== phase.id && (
                                <div className="flex items-center gap-2 no-print">
                                    <Button variant="ghost" size="icon" onClick={() => startEditingPhase(phase)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeletePhase(phase.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                                )}
                            </div>
                            {phase.steps?.map((step, stepIndex) => (
                                <Collapsible key={step.id} className="p-4 bg-muted/50 print:border print:shadow-none print:bg-white print:break-inside-avoid rounded-lg">
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between cursor-pointer">
                                            <p className="font-semibold text-sm">Step {phaseIndex + 1}.{stepIndex + 1}: {step.description}</p>
                                            <ChevronDown className="h-4 w-4" />
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pl-4 mt-2 space-y-3 pt-3 border-t">
                                        {step.hazards?.map(hazard => (
                                        <div key={hazard.id} className="p-3 bg-white dark:bg-card rounded-md border print:border print:mt-2">
                                            <p className="moc-print-hazard-title">Hazard: <span className="font-normal text-black">{hazard.description}</span></p>
                                            {hazard.risks?.map(risk => (
                                            <div key={risk.id} className="pl-4 pt-2 mt-2 moc-print-risk-wrapper">
                                                <div className="flex justify-between items-start">
                                                    <p className="flex-1 moc-print-risk-title">Risk: <span className="font-normal text-black">{risk.description}</span></p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="font-mono print-force-color" style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>{getAlphanumericCode(risk.likelihood, risk.severity)}</Badge>
                                                        {canEdit && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDialogState({ type: 'editRisk', data: {phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id} })}><Edit className="h-3 w-3" /></Button>}
                                                    </div>
                                                </div>
                                                {risk.mitigations?.map(mit => (
                                                    <div key={mit.id} className="pl-4 pt-2 mt-2 moc-print-mitigation-wrapper">
                                                        <div className="flex justify-between items-start">
                                                            <p className="flex-1 moc-print-mitigation-title">Mitigation: <span className="font-normal text-black">{mit.description}</span></p>
                                                            <Badge className="font-mono print-force-color" style={{backgroundColor: getRiskScoreColor(mit.residualRiskScore), color: 'white'}}>{getAlphanumericCode(mit.residualLikelihood, mit.residualSeverity)}</Badge>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            <span>{mit.responsiblePerson}</span>
                                                            {mit.responsiblePerson && mit.completionDate && <span> | </span>}
                                                            <span>{mit.completionDate ? format(parseISO(mit.completionDate), 'PPP') : ''}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            ))}
                                        </div>
                                        ))}
                                        {canEdit && (
                                        <div className="flex gap-2 mt-2 no-print">
                                            <Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'addHazard', data: { phaseId: phase.id, stepId: step.id } })}>Add Hazard</Button>
                                        </div>
                                        )}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                            {canEdit && <Button variant="outline" size="sm" className="mt-2 no-print" onClick={() => setDialogState({ type: 'addStep', data: { phaseId: phase.id } })}>Add Step</Button>}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center text-center h-24 border-2 border-dashed rounded-lg no-print">
                        <h4 className="text-lg font-semibold">Start the Implementation Plan</h4>
                        <p className="text-muted-foreground text-sm">
                            Use the AI to generate a plan, or add your first implementation phase manually.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={dialogState.type !== null} onOpenChange={() => setDialogState({ type: null, data: null })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {dialogState.type === 'addStep' && 'Add Implementation Step'}
                        {dialogState.type === 'addHazard' && 'Add Hazard'}
                        {dialogState.type === 'editRisk' && 'Edit Risk'}
                    </DialogTitle>
                </DialogHeader>
                {dialogState.type === 'addStep' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Describe the new step..." />}
                {dialogState.type === 'addHazard' && <TextareaForm onSubmit={handleDialogSubmit} placeholder="Describe the potential hazard..." />}
                {dialogState.type === 'editRisk' && <RiskForm onSubmit={handleDialogSubmit} risk={moc?.phases?.find(p => p.id === dialogState.data.phaseId)?.steps?.find(s => s.id === dialogState.data.stepId)?.hazards?.find(h => h.id === dialogState.data.hazardId)?.risks?.find(r => r.id === dialogState.data.riskId)} />}
            </DialogContent>
        </Dialog>
    </main>
  );
}

const TextareaForm = ({ onSubmit, placeholder }: { onSubmit: (data: { description: string }) => void, placeholder: string }) => {
    const [description, setDescription] = useState('');
    return (
        <div className="space-y-4 py-4">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={placeholder} />
            <DialogFooter>
                <Button onClick={() => onSubmit({ description })} disabled={!description.trim()}>Save</Button>
            </DialogFooter>
        </div>
    );
};

const RiskForm = ({ onSubmit, risk }: { onSubmit: (data: any) => void, risk?: MocRisk }) => {
    const [description, setDescription] = useState(risk?.description || '');
    const [likelihood, setLikelihood] = useState<RiskLikelihood | undefined>(risk?.likelihood);
    const [severity, setSeverity] = useState<RiskSeverity | undefined>(risk?.severity);

    return (
        <div className="space-y-4 py-4">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the risk..." />
            <div className="grid grid-cols-2 gap-4">
                <Select value={likelihood} onValueChange={(v: RiskLikelihood) => setLikelihood(v)}>
                    <SelectTrigger><SelectValue placeholder="Select Likelihood" /></SelectTrigger>
                    <SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                 <Select value={severity} onValueChange={(v: RiskSeverity) => setSeverity(v)}>
                    <SelectTrigger><SelectValue placeholder="Select Severity" /></SelectTrigger>
                    <SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button onClick={() => onSubmit({ description, likelihood, severity })} disabled={!description.trim() || !likelihood || !severity}>Save Risk</Button>
            </DialogFooter>
        </div>
    );
};


MocDetailPage.title = "Management of Change";

