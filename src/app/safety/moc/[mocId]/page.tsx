

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocStep, MocHazard, MocRisk, MocMitigation, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LIKELIHOOD_MAP, SEVERITY_MAP, getRiskScore, getRiskScoreColor, REVERSE_SEVERITY_MAP, REVERSE_LIKELIHOOD_MAP } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
);

const AddPhaseDialog = ({ onAddPhase }: { onAddPhase: (title: string) => void }) => {
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
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={!title.trim()}>Confirm</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const HazardAnalysis = ({ phase, onUpdateHazards, mocId }: { phase: MocStep; onUpdateHazards: (hazards: MocHazard[]) => void; mocId: string }) => {
    const [hazards, setHazards] = useState<MocHazard[]>(phase.hazards || []);

    const addHazard = () => {
        const newHazard: MocHazard = {
            id: `hazard-${Date.now()}`,
            description: '',
            risks: [],
            mitigations: [],
        };
        const updatedHazards = [...hazards, newHazard];
        setHazards(updatedHazards);
        onUpdateHazards(updatedHazards);
    };

    const updateHazard = (hazardId: string, description: string) => {
        const updated = hazards.map(h => h.id === hazardId ? { ...h, description } : h);
        setHazards(updated);
        onUpdateHazards(updated);
    };

    const addRisk = (hazardId: string) => {
        const newRisk: MocRisk = { id: `risk-${Date.now()}`, description: '', likelihood: 'Improbable', severity: 'Negligible' };
        const updated = hazards.map(h => h.id === hazardId ? { ...h, risks: [...(h.risks || []), newRisk] } : h);
        setHazards(updated);
        onUpdateHazards(updated);
    };

    const updateRisk = (hazardId: string, riskId: string, field: keyof MocRisk, value: string) => {
        const updated = hazards.map(h => {
            if (h.id === hazardId) {
                const updatedRisks = (h.risks || []).map(r => r.id === riskId ? { ...r, [field]: value } : r);
                return { ...h, risks: updatedRisks };
            }
            return h;
        });
        setHazards(updated);
        onUpdateHazards(updated);
    };
    
    const addMitigation = (hazardId: string) => {
        const newMitigation: MocMitigation = { id: `mitigation-${Date.now()}`, description: '', likelihood: 'Improbable', severity: 'Negligible' };
        const updated = hazards.map(h => h.id === hazardId ? { ...h, mitigations: [...(h.mitigations || []), newMitigation] } : h);
        setHazards(updated);
        onUpdateHazards(updated);
    }
    
    const updateMitigation = (hazardId: string, mitigationId: string, field: keyof MocMitigation, value: string) => {
         const updated = hazards.map(h => {
            if (h.id === hazardId) {
                const updatedMitigations = (h.mitigations || []).map(m => m.id === mitigationId ? { ...m, [field]: value } : m);
                return { ...h, mitigations: updatedMitigations };
            }
            return h;
        });
        setHazards(updated);
        onUpdateHazards(updated);
    }

    return (
        <div className="space-y-4">
            <Button onClick={addHazard} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Hazard</Button>
            {hazards.map((hazard, hIndex) => (
                <div key={hazard.id} className="border p-4 rounded-lg space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Potential Hazard</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             <TableRow>
                                <TableCell className="font-semibold">H{hIndex + 1}</TableCell>
                                <TableCell>
                                    <Textarea value={hazard.description} onChange={(e) => updateHazard(hazard.id, e.target.value)} placeholder="Describe the potential hazard..." />
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    
                    <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Risk/s</TableHead>
                                <TableHead className="w-24">P</TableHead>
                                <TableHead className="w-24">S</TableHead>
                                <TableHead className="w-24">PxS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {(hazard.risks || []).map((risk, rIndex) => {
                                const score = getRiskScore(risk.likelihood, risk.severity);
                                return (
                                    <TableRow key={risk.id}>
                                        <TableCell className="font-semibold">R{rIndex + 1}</TableCell>
                                        <TableCell>
                                            <Textarea value={risk.description} onChange={(e) => updateRisk(hazard.id, risk.id, 'description', e.target.value)} placeholder="Describe the associated risk..." />
                                        </TableCell>
                                        <TableCell>
                                            <Select value={risk.likelihood} onValueChange={(val) => updateRisk(hazard.id, risk.id, 'likelihood', val)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>{Object.entries(LIKELIHOOD_MAP).map(([key, val]) => <SelectItem key={key} value={key}>{val}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Select value={risk.severity} onValueChange={(val) => updateRisk(hazard.id, risk.id, 'severity', val)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>{Object.entries(SEVERITY_MAP).map(([key, val]) => <SelectItem key={key} value={key}>{val}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Badge style={{ backgroundColor: getRiskScoreColor(score) }} className="text-white w-full flex justify-center">{LIKELIHOOD_MAP[risk.likelihood]}{SEVERITY_MAP[risk.severity]}</Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Button onClick={() => addRisk(hazard.id)} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Risk</Button>
                    
                     <Table>
                         <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Mitigation</TableHead>
                                <TableHead className="w-24">P</TableHead>
                                <TableHead className="w-24">S</TableHead>
                                <TableHead className="w-24">PxS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(hazard.mitigations || []).map((mitigation, mIndex) => {
                                const score = getRiskScore(mitigation.likelihood, mitigation.severity);
                                return (
                                <TableRow key={mitigation.id}>
                                    <TableCell className="font-semibold">M{mIndex + 1}</TableCell>
                                    <TableCell>
                                        <Textarea value={mitigation.description} onChange={(e) => updateMitigation(hazard.id, mitigation.id, 'description', e.target.value)} placeholder="Describe the mitigation action..." />
                                    </TableCell>
                                    <TableCell>
                                         <Select value={mitigation.likelihood} onValueChange={(val) => updateMitigation(hazard.id, mitigation.id, 'likelihood', val)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>{Object.entries(LIKELIHOOD_MAP).map(([key, val]) => <SelectItem key={key} value={key}>{val}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={mitigation.severity} onValueChange={(val) => updateMitigation(hazard.id, mitigation.id, 'severity', val)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>{Object.entries(SEVERITY_MAP).map(([key, val]) => <SelectItem key={key} value={key}>{val}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Badge style={{ backgroundColor: getRiskScoreColor(score) }} className="text-white w-full flex justify-center">{LIKELIHOOD_MAP[mitigation.likelihood]}{SEVERITY_MAP[mitigation.severity]}</Badge>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    <Button onClick={() => addMitigation(hazard.id)} variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Mitigation</Button>
                </div>
            ))}
        </div>
    );
};


export default function MocDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, company, loading: userLoading } = useUser();
  const mocId = params.mocId as string;
  const [moc, setMoc] = useState<ManagementOfChange | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<MocStep | null>(null);
  const { toast } = useToast();
  
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
    if (!moc) return;
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
  
  const handleUpdatePhase = (phaseId: string, newHazards: MocHazard[]) => {
    if (!moc) return;
    const updatedSteps = moc.steps?.map(s => s.id === phaseId ? { ...s, hazards: newHazards } : s);
    handleUpdate({ steps: updatedSteps }, false); // Save silently in the background
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
                        <button key={step.id} onClick={() => setSelectedPhase(step)} className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors flex justify-between items-center">
                            <h4 className="font-semibold">Phase {index + 1}: {step.description}</h4>
                             <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); /* edit logic */}}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); /* delete logic */}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        </button>
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

      <Dialog open={!!selectedPhase} onOpenChange={(isOpen) => !isOpen && setSelectedPhase(null)}>
        <DialogContent className="max-w-5xl">
            <DialogHeader>
                <DialogTitle>Hazard Analysis: {selectedPhase?.description}</DialogTitle>
                <DialogDescription>
                    Identify potential hazards associated with this implementation phase and assess their risks.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {selectedPhase && (
                 <HazardAnalysis phase={selectedPhase} onUpdateHazards={(hazards) => handleUpdatePhase(selectedPhase.id, hazards)} mocId={mocId} />
              )}
            </div>
             <DialogFooter>
                <Button onClick={() => setSelectedPhase(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

MocDetailPage.title = "Management of Change";
