

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
import { ArrowLeft, PlusCircle, Trash2, Edit, Wind, Printer, Bot, Loader2, ChevronDown } from 'lucide-react';
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


const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1 print:break-inside-avoid">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
);

const AddPhaseDialog = ({ onAddPhase }: { onAddPhase: (title:string) => void }) => {
    const [title, setTitle] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const handleSubmit = () => {
        if (title.trim()) {
            onAddPhase(title.trim());
            setTitle('');
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Phase
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Implementation Phase</DialogTitle>
                    <DialogDescription>
                        Enter a title for this phase of the change implementation.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="phase-title">Phase Title</Label>
                    <Input 
                        id="phase-title" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Initial Training & Documentation"
                    />
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={!title.trim()}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const probabilityOptions: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityOptions: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];


const HazardAnalysisDialog = ({ phase, onUpdate, onClose, phaseNumber }: { phase: MocPhase, onUpdate: (updatedPhase: MocPhase) => void, onClose: () => void, phaseNumber: number }) => {
    const [localPhase, setLocalPhase] = useState<MocPhase>(phase);

    const handleAddStep = (phaseId: string) => {
        const newStep: MocStep = {
            id: `step-${Date.now()}`,
            description: '',
            hazards: [],
        };
        setLocalPhase(prev => ({
            ...prev,
            steps: [...(prev.steps || []), newStep]
        }));
    };
    
    const handleAddHazard = (stepId?: string) => {
        const newHazard: MocHazard = {
            id: `hazard-${Date.now()}`,
            description: '',
            risks: [],
        };
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, hazards: [...(s.hazards || []), newHazard] } : s)
        }));
    };
    
    const handleAddRisk = (stepId: string, hazardId?: string) => {
         const newRisk: MocRisk = {
            id: `risk-${Date.now()}`,
            description: '',
            likelihood: 'Improbable',
            severity: 'Minor',
            riskScore: 4,
            mitigations: [],
        };
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => {
                if (s.id === stepId) {
                    return {
                        ...s,
                        hazards: s.hazards?.map(h => 
                            h.id === hazardId
                            ? { ...h, risks: [...(h.risks || []), newRisk] }
                            : h
                        )
                    };
                }
                return s;
            })
        }));
    };
    
    const handleAddMitigation = (stepId: string, hazardId: string, riskId: string) => {
        const newMitigation: MocMitigation = {
            id: `mit-${Date.now()}`,
            description: '',
            responsiblePerson: '',
            completionDate: '',
            residualLikelihood: 'Improbable',
            residualSeverity: 'Negligible',
            residualRiskScore: 2,
        };
         setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => h.id === hazardId ? {
                    ...h,
                    risks: h.risks?.map(r => 
                        r.id === riskId 
                        ? { ...r, mitigations: [...(r.mitigations || []), newMitigation] }
                        : r
                    )
                } : h)
            } : s)
        }));
    };
    
    const handleStepChange = (stepId: string, value: string) => {
         setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, description: value } : s)
        }));
    };
    
    const handleHazardChange = (stepId: string, hazardId: string, value: string) => {
         setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => h.id === hazardId ? { ...h, description: value } : h)
            } : s)
        }));
    };
    
    const handleRiskChange = (stepId: string, hazardId: string, riskId: string, field: keyof MocRisk, value: any) => {
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => {
                    if (h.id === hazardId) {
                        const updatedRisks = h.risks?.map(r => {
                            if (r.id === riskId) {
                                const updatedRisk = { ...r, [field]: value };
                                if (field === 'likelihood' || field === 'severity') {
                                    updatedRisk.riskScore = getRiskScore(updatedRisk.likelihood, updatedRisk.severity);
                                }
                                return updatedRisk;
                            }
                            return r;
                        });
                        return { ...h, risks: updatedRisks };
                    }
                    return h;
                })
            } : s)
        }));
    };

    const handleMitigationChange = (stepId: string, hazardId: string, riskId: string, mitigationId: string, field: keyof MocMitigation, value: any) => {
         setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => h.id === hazardId ? {
                    ...h,
                    risks: h.risks?.map(r => {
                        if (r.id === riskId) {
                            return {
                                ...r,
                                mitigations: r.mitigations?.map(m => {
                                    if (m.id === mitigationId) {
                                        let updatedMitigation = { ...m, [field]: value };
                                        if (field === 'residualLikelihood' || field === 'residualSeverity') {
                                            updatedMitigation.residualRiskScore = getRiskScore(updatedMitigation.residualLikelihood, updatedMitigation.residualSeverity);
                                        }
                                        if (field === 'completionDate' && value instanceof Date) {
                                            updatedMitigation = { ...updatedMitigation, completionDate: format(value, 'yyyy-MM-dd') };
                                        }
                                        return updatedMitigation;
                                    }
                                    return m;
                                })
                            };
                        }
                        return r;
                    })
                } : h)
            } : s)
        }));
    };
    
    const handleDeleteStep = (stepId: string) => {
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps?.filter(s => s.id !== stepId)
        }));
    };
    
    const handleDeleteHazard = (stepId: string, hazardId: string) => {
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.filter(h => h.id !== hazardId)
            } : s)
        }));
    };

    const handleDeleteRisk = (stepId: string, hazardId: string, riskId: string) => {
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => 
                    h.id === hazardId
                    ? { ...h, risks: h.risks?.filter(r => r.id !== riskId) }
                    : h
                )
            } : s)
        }));
    }

    const handleDeleteMitigation = (stepId: string, hazardId: string, riskId: string, mitigationId: string) => {
        setLocalPhase(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {
                ...s,
                hazards: s.hazards?.map(h => h.id === hazardId ? {
                    ...h,
                    risks: h.risks?.map(r =>
                        r.id === riskId
                        ? { ...r, mitigations: r.mitigations?.filter(m => m.id !== mitigationId) }
                        : r
                    )
                } : h)
            } : s)
        }));
    }

    const handleSave = () => {
        onUpdate(localPhase);
        onClose();
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Phase {phaseNumber}: {phase.description}</DialogTitle>
                 <div className="flex items-center gap-2 pt-2">
                    <Button className="w-fit" onClick={() => handleAddStep(phase.id)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Step
                    </Button>
                </div>
            </DialogHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                {localPhase.steps?.map((step, stepIndex) => {
                    let hazardCounter = 0;
                    let riskCounter = 0;
                    let mitigationCounter = 0;
                    
                    return (
                    <Card key={step.id} className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor={`step-desc-${stepIndex}`} className="font-semibold">{`Step ${phaseNumber}.${stepIndex + 1}`}</Label>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleAddHazard(step.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Hazard
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteStep(step.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <Input
                            id={`step-desc-${stepIndex}`}
                            placeholder="Describe the implementation step..."
                            value={step.description}
                            onChange={(e) => handleStepChange(step.id, e.target.value)}
                        />
                        {step.hazards?.map((hazard) => {
                            hazardCounter++;
                            
                            return (
                            <Card key={hazard.id} className="p-4 border-red-500 space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor={`hazard-desc-${hazardCounter}`} className="font-semibold text-red-600">{`Hazard ${phaseNumber}.${stepIndex + 1}.${hazardCounter}`}</Label>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleAddRisk(step.id, hazard.id)}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Risk
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteHazard(step.id, hazard.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    id={`hazard-desc-${hazardCounter}`}
                                    placeholder="Describe the potential hazard..."
                                    value={hazard.description}
                                    onChange={(e) => handleHazardChange(step.id, hazard.id, e.target.value)}
                                />
                                {hazard.risks?.map((risk) => {
                                    riskCounter++;

                                    return (
                                    <Card key={risk.id} className="p-4 border-yellow-500 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-semibold text-yellow-600">{`Risk ${phaseNumber}.${stepIndex + 1}.${hazardCounter}.${riskCounter}`}</Label>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRisk(step.id, hazard.id, risk.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Input
                                            placeholder="Describe the potential risk..."
                                            value={risk.description}
                                            onChange={(e) => handleRiskChange(step.id, hazard.id, risk.id, 'description', e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Likelihood</Label>
                                                <Select value={risk.likelihood} onValueChange={(value) => handleRiskChange(step.id, hazard.id, risk.id, 'likelihood', value)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                             <div className="space-y-2">
                                                <Label>Severity</Label>
                                                <Select value={risk.severity} onValueChange={(value) => handleRiskChange(step.id, hazard.id, risk.id, 'severity', value)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <Label>Risk Score:</Label>
                                            <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore) }}>{risk.riskScore} - {getRiskLevel(risk.riskScore)}</Badge>
                                        </div>

                                        <Separator />
                                        
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>Mitigation Controls</Label>
                                                <Button variant="outline" size="sm" onClick={() => handleAddMitigation(step.id, hazard.id, risk.id)}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Mitigation
                                                </Button>
                                            </div>
                                            {risk.mitigations?.map((mitigation) => {
                                                mitigationCounter++;
                                                return (
                                                <Card key={mitigation.id} className="p-3 border-green-500 bg-muted/50 space-y-3">
                                                     <div className="flex items-center justify-between">
                                                        <Label className="font-semibold text-green-600">{`Mitigation ${phaseNumber}.${stepIndex + 1}.${hazardCounter}.${riskCounter}.${mitigationCounter}`}</Label>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteMitigation(step.id, hazard.id, risk.id, mitigation.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                     <Textarea 
                                                        placeholder="Describe the mitigation control..." 
                                                        value={mitigation.description} 
                                                        onChange={(e) => handleMitigationChange(step.id, hazard.id, risk.id, mitigation.id, 'description', e.target.value)}
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Input 
                                                            placeholder="Responsible Person" 
                                                            value={mitigation.responsiblePerson}
                                                            onChange={(e) => handleMitigationChange(step.id, hazard.id, risk.id, mitigation.id, 'responsiblePerson', e.target.value)}
                                                        />
                                                         <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !mitigation.completionDate && "text-muted-foreground")}>
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {mitigation.completionDate ? format(parseISO(mitigation.completionDate), "PPP") : <span>Set Date</span>}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={mitigation.completionDate ? parseISO(mitigation.completionDate) : undefined} onSelect={(date) => handleMitigationChange(step.id, hazard.id, risk.id, mitigation.id, 'completionDate', date)} /></PopoverContent>
                                                        </Popover>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Residual Likelihood</Label>
                                                            <Select value={mitigation.residualLikelihood} onValueChange={(value) => handleMitigationChange(step.id, hazard.id, risk.id, mitigation.id, 'residualLikelihood', value)}>
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                <SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </div>
                                                         <div className="space-y-2">
                                                            <Label>Residual Severity</Label>
                                                            <Select value={mitigation.residualSeverity} onValueChange={(value) => handleMitigationChange(step.id, hazard.id, risk.id, mitigation.id, 'residualSeverity', value)}>
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                                <SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                     <div className="flex items-center justify-end gap-2">
                                                        <Label>Residual Risk Score:</Label>
                                                        <Badge style={{ backgroundColor: getRiskScoreColor(mitigation.residualRiskScore) }}>{mitigation.residualRiskScore} - {getRiskLevel(mitigation.residualRiskScore)}</Badge>
                                                    </div>
                                                </Card>
                                            )})}
                                        </div>
                                    </Card>
                                )})}
                            </Card>
                        )})}
                    </Card>
                )})}
                {(!localPhase.steps || localPhase.steps.length === 0) && (
                    <div className="text-sm text-center text-muted-foreground py-8">No steps added yet for this phase.</div>
                )}
            </CardContent>
            <DialogFooter>
                <Button onClick={onClose} variant="outline">Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    );
};

export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const mocId = params.mocId as string;
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [selectedPhase, setSelectedPhase] = useState<MocPhase | null>(null);
  const [editingPhase, setEditingPhase] = useState<MocPhase | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisParams, setAnalysisParams] = useState('');
  
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
    setLoading(true);
    const mocRef = doc(db, `companies/${company.id}/management-of-change`, moc.id);
    try {
      await updateDoc(mocRef, updatedData);
      const updatedMoc = { ...moc, ...updatedData };
      setMoc(updatedMoc);
      if (showToast) {
          toast({ title: 'MOC Updated', description: 'Your changes have been saved.' });
      }
    } catch (error) {
      console.error("Error updating MOC:", error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes to MOC.' });
    } finally {
      setLoading(false);
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

  const handleAddPhase = (title: string) => {
    if (!moc) return;

    const newPhase: MocPhase = {
      id: `phase-${Date.now()}`,
      description: title,
      steps: [],
    };

    const updatedPhases = [...(moc.phases || []), newPhase];
    handleUpdate({ phases: updatedPhases });
    toast({ title: 'Phase Added', description: `Phase ${updatedPhases.length}: ${title} has been added.` });
  };
  
  const handleDeletePhase = (phaseId: string) => {
    if (!moc) return;
    const updatedPhases = moc.phases?.filter(p => p.id !== phaseId);
    handleUpdate({ phases: updatedPhases });
    toast({ title: 'Phase Deleted', description: 'The implementation phase has been removed.' });
  }

  const handleUpdatePhase = (updatedPhase: MocPhase) => {
      if (!moc) return;
      const updatedPhases = moc.phases?.map(p => p.id === updatedPhase.id ? updatedPhase : p);
      handleUpdate({ phases: updatedPhases });
  };
  
  const handleEditPhase = (phaseId: string, newDescription: string) => {
    if (!moc) return;
    const updatedPhases = moc.phases?.map(p => p.id === phaseId ? { ...p, description: newDescription } : p);
    handleUpdate({ phases: updatedPhases });
    setEditingPhase(null);
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
                <div>
                    <Badge>{moc.status}</Badge>
                    <CardTitle className="mt-2">{moc.mocNumber}: {moc.title}</CardTitle>
                    <CardDescription>
                        Proposed by {moc.proposedBy} on {format(parseISO(moc.proposalDate), 'MMMM d, yyyy')}
                    </CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
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
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-lg border p-4 no-print">
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
                                <AddPhaseDialog onAddPhase={handleAddPhase} />
                            </div>
                        </>
                    )}
                </div>
                 
                <div className="space-y-4">
                    {moc.phases && moc.phases.length > 0 ? (
                        moc.phases.map((phase, index) => (
                            <Collapsible key={phase.id} className="border rounded-lg print:break-inside-avoid print:border-none" defaultOpen>
                                <CollapsibleTrigger asChild>
                                    <div className="flex justify-between items-center p-3 hover:bg-muted transition-colors cursor-pointer">
                                        <div className="flex-1 text-left flex items-center gap-2">
                                            <h4 className="font-semibold">{index + 1}. {phase.description}</h4>
                                            <ChevronDown className="h-4 w-4 transition-transform duration-200 no-print" />
                                        </div>
                                        <div className="flex items-center gap-2 no-print">
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPhase(phase); }}>
                                                <Wind className="mr-2 h-4 w-4" />
                                                Analyze ({phase.steps?.length || 0} Steps)
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingPhase(phase); }}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeletePhase(phase.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="p-4 pt-0 space-y-4">
                                        {phase.steps?.length > 0 ? phase.steps.map((step, stepIndex) => (
                                            <Card key={step.id} className="p-4 bg-muted/50 print:border print:shadow-none print:bg-white">
                                                <p className="font-semibold text-sm">Step {index + 1}.{stepIndex + 1}: {step.description}</p>
                                                <div className="pl-4 mt-2 space-y-3">
                                                    {step.hazards?.map(hazard => (
                                                    <div key={hazard.id} className="p-3 bg-white dark:bg-card rounded-md border print:border print:mt-2">
                                                        <p className="font-semibold text-red-600">Hazard: <span className="font-normal text-black">{hazard.description}</span></p>
                                                        {hazard.risks?.map(risk => (
                                                        <div key={risk.id} className="pl-4 pt-2 mt-2">
                                                            <div className="flex justify-between items-start">
                                                                <p className="flex-1"><span className="font-semibold text-orange-500">Risk:</span> <span className="font-normal text-black">{risk.description}</span></p>
                                                                <Badge className="font-mono print-force-color" style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>{getAlphanumericCode(risk.likelihood, risk.severity)}</Badge>
                                                            </div>
                                                            {risk.mitigations?.map(mit => (
                                                                <div key={mit.id} className="pl-4 pt-2 mt-2">
                                                                    <div className="flex justify-between items-start">
                                                                        <p className="flex-1"><span className="font-semibold text-green-600">Mitigation:</span> <span className="font-normal text-black">{mit.description}</span></p>
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
                                                </div>
                                            </Card>
                                        )) : <p className="text-xs text-muted-foreground text-center py-4">No steps defined for this phase.</p>}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center h-24 border-2 border-dashed rounded-lg no-print">
                            <h4 className="text-lg font-semibold">Start the Implementation Plan</h4>
                            <p className="text-muted-foreground text-sm">
                                Use the AI to generate a plan, or add your first implementation phase manually.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
      {selectedPhase && (
        <Dialog open={!!selectedPhase} onOpenChange={(isOpen) => !isOpen && setSelectedPhase(null)}>
            <HazardAnalysisDialog 
                phase={selectedPhase} 
                onUpdate={handleUpdatePhase}
                onClose={() => setSelectedPhase(null)}
                phaseNumber={moc.phases?.findIndex(p => p.id === selectedPhase.id) + 1 || 0}
            />
        </Dialog>
      )}
      {editingPhase && (
          <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Edit Phase Title</DialogTitle>
                  </DialogHeader>
                  <Input 
                      defaultValue={editingPhase.description}
                      id="edit-phase-input"
                  />
                  <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingPhase(null)}>Cancel</Button>
                      <Button onClick={() => {
                          const newDesc = (document.getElementById('edit-phase-input') as HTMLInputElement).value;
                          if (newDesc) handleEditPhase(editingPhase.id, newDesc);
                      }}>Save</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      )}
    </main>
  );
}

MocDetailPage.title = "Management of Change";

