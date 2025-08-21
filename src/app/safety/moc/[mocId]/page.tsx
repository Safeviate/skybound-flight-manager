

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocStep, MocHazard, RiskLikelihood, RiskSeverity, MocRisk } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Edit, Wind } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
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

const HazardAnalysisDialog = ({ step, onUpdate, onClose }: { step: MocStep, onUpdate: (updatedStep: MocStep) => void, onClose: () => void }) => {
    const [localStep, setLocalStep] = useState<MocStep>(step);
    
    const handleAddHazard = () => {
        const newHazard: MocHazard = {
            id: `hazard-${Date.now()}`,
            description: '',
            risks: [],
        };
        setLocalStep(prev => ({
            ...prev,
            hazards: [...(prev.hazards || []), newHazard]
        }));
    };
    
    const handleAddRisk = () => {
        if (!localStep.hazards || localStep.hazards.length === 0) {
            // If no hazards exist, add one first then add the risk.
            const newHazard: MocHazard = {
                id: `hazard-${Date.now()}`,
                description: '',
                risks: [{ id: `risk-${Date.now()}`, description: '' }]
            };
             setLocalStep(prev => ({ ...prev, hazards: [...(prev.hazards || []), newHazard] }));
        } else {
            const updatedHazards = [...localStep.hazards];
            const lastHazard = updatedHazards[updatedHazards.length - 1];
            lastHazard.risks = [...(lastHazard.risks || []), { id: `risk-${Date.now()}`, description: '' }];
            setLocalStep(prev => ({ ...prev, hazards: updatedHazards }));
        }
    };
    
    const handleHazardChange = (hazardId: string, value: string) => {
        setLocalStep(prev => ({
            ...prev,
            hazards: prev.hazards?.map(h => h.id === hazardId ? { ...h, description: value } : h)
        }));
    };
    
    const handleRiskChange = (hazardId: string, riskId: string, value: string) => {
        setLocalStep(prev => ({
            ...prev,
            hazards: prev.hazards?.map(h => 
                h.id === hazardId 
                ? { ...h, risks: h.risks?.map(r => r.id === riskId ? { ...r, description: value } : r) }
                : h
            )
        }));
    };
    
    const handleDeleteHazard = (hazardId: string) => {
        setLocalStep(prev => ({
            ...prev,
            hazards: prev.hazards?.filter(h => h.id !== hazardId)
        }));
    };

    const handleSave = () => {
        onUpdate(localStep);
        onClose();
    };

    return (
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Hazard Analysis for: {step.description}</DialogTitle>
                 <div className="flex items-center gap-2 pt-2">
                    <Button className="w-fit" onClick={handleAddHazard}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Hazard
                    </Button>
                    <Button className="w-fit" variant="outline" onClick={handleAddRisk}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Risk
                    </Button>
                </div>
            </DialogHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                {localStep.hazards?.map((hazard, index) => (
                    <div key={hazard.id} className="p-4 border rounded-md space-y-4">
                        <div className="flex items-center justify-between">
                             <Label htmlFor={`hazard-desc-${index}`} className="font-semibold">Hazard #{index + 1}</Label>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteHazard(hazard.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <Textarea 
                            id={`hazard-desc-${index}`}
                            placeholder="Describe the potential hazard..."
                            value={hazard.description}
                            onChange={(e) => handleHazardChange(hazard.id, e.target.value)}
                        />
                         {hazard.risks?.map((risk, riskIndex) => (
                            <div key={risk.id} className="pl-6 space-y-2">
                                 <Label htmlFor={`risk-desc-${riskIndex}`} className="text-muted-foreground">Risk for Hazard #{index + 1}</Label>
                                 <Textarea
                                    id={`risk-desc-${riskIndex}`}
                                    placeholder="Describe the associated risk..."
                                    value={risk.description}
                                    onChange={(e) => handleRiskChange(hazard.id, risk.id, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                ))}
                {(!localStep.hazards || localStep.hazards.length === 0) && (
                    <div className="text-sm text-center text-muted-foreground py-8">No hazards added yet.</div>
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
  const [selectedPhase, setSelectedPhase] = useState<MocStep | null>(null);
  
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

  const handleAddPhase = (title: string) => {
    if (!moc) return;

    const newStep: MocStep = {
      id: `step-${Date.now()}`,
      description: title,
      hazards: [],
    };

    const updatedSteps = [...(moc.steps || []), newStep];
    handleUpdate({ steps: updatedSteps });
    toast({ title: 'Phase Added', description: `Phase ${updatedSteps.length}: ${title} has been added.` });
  };
  
  const handleDeletePhase = (phaseId: string) => {
    if (!moc) return;
    const updatedSteps = moc.steps?.filter(s => s.id !== phaseId);
    handleUpdate({ steps: updatedSteps });
    toast({ title: 'Phase Deleted', description: 'The implementation phase has been removed.' });
  }

  const handleUpdatePhase = (updatedStep: MocStep) => {
      if (!moc) return;
      const updatedSteps = moc.steps?.map(s => s.id === updatedStep.id ? updatedStep : s);
      handleUpdate({ steps: updatedSteps });
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
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-start">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to MOC List
            </Button>
        </div>
        
        <Card>
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

        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Implementation Phases</CardTitle>
                        <CardDescription>
                            Outline the steps required to implement the change.
                        </CardDescription>
                    </div>
                    {canEdit && <AddPhaseDialog onAddPhase={handleAddPhase} />}
                </div>
            </CardHeader>
            <CardContent>
            {moc.steps && moc.steps.length > 0 ? (
                <div className="space-y-2">
                    {moc.steps.map((step, index) => (
                         <div key={step.id} className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors flex justify-between items-center">
                            <h4 className="font-semibold">Phase {index + 1}: {step.description}</h4>
                             <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedPhase(step)}>
                                    <Wind className="mr-2 h-4 w-4" />
                                    Hazards
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); /* edit logic */}}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeletePhase(step.id) }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No implementation phases have been added yet.</p>
                </div>
            )}
            </CardContent>
        </Card>
      </div>
      {selectedPhase && (
        <Dialog open={!!selectedPhase} onOpenChange={(isOpen) => !isOpen && setSelectedPhase(null)}>
            <HazardAnalysisDialog 
                step={selectedPhase} 
                onUpdate={handleUpdatePhase}
                onClose={() => setSelectedPhase(null)}
            />
        </Dialog>
      )}
    </main>
  );
}

MocDetailPage.title = "Management of Change";
