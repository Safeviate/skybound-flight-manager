
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocPhase, MocStep, MocHazard, RiskLikelihood, RiskSeverity, MocRisk, MocMitigation, User, Alert, Signature } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Trash2, Edit, Wind, Printer, Bot, Loader2, ChevronDown, Save, ShieldAlert } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RiskAssessmentTool } from '../../[reportId]/risk-assessment-tool';
import { SignaturePad } from '@/components/ui/signature-pad';

const probabilityOptions: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityOptions: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];
const statusOptions: MocMitigation['status'][] = ['Open', 'In Progress', 'Closed'];

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
  const [personnel, setPersonnel] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisParams, setAnalysisParams] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>(null);
  
  const canEdit = useMemo(() => user?.permissions.includes('MOC:Edit') || user?.permissions.includes('Super User'), [user]);

  const fetchMocAndPersonnel = useCallback(async () => {
    if (!mocId || !company) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const mocRef = doc(db, `companies/${company.id}/management-of-change`, mocId);
      const personnelQuery = query(collection(db, `companies/${company.id}/users`));

      const [mocSnap, personnelSnap] = await Promise.all([
          getDoc(mocRef),
          getDocs(personnelQuery)
      ]);
      

      if (mocSnap.exists()) {
        setMoc({ id: mocSnap.id, ...mocSnap.data() } as ManagementOfChange);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Management of Change record not found.' });
        setMoc(null);
      }

       if (!personnelSnap.empty) {
        setPersonnel(personnelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
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
    fetchMocAndPersonnel();
  }, [mocId, user, userLoading, router, fetchMocAndPersonnel]);

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
        toast({ variant: 'destructive', title: 'AI Feature Disabled', description: 'This feature is temporarily unavailable.' });
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
        updatedPhases = updatedPhases.map(p => (p.id === data.phaseId ? { ...p, steps: p.steps?.map(s => (s.id === data.stepId ? { ...s, hazards: [...(s.hazards || []), newHazard] } : s)) } : p));
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
    const { phaseId, stepId, hazardId, riskId, mitigationId } = ids;

    if (itemType === 'phase') {
        updatedPhases = updatedPhases.filter((p: MocPhase) => p.id !== phaseId);
    } else if (itemType === 'step') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === phaseId ? { ...p, steps: p.steps?.filter(s => s.id !== stepId) } : p);
    } else if (itemType === 'hazard') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === phaseId ? { ...p, steps: p.steps?.map(s => s.id === stepId ? { ...s, hazards: s.hazards?.filter(h => h.id !== hazardId) } : s) } : p);
    } else if (itemType === 'risk') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === phaseId ? { ...p, steps: p.steps?.map(s => s.id === stepId ? { ...s, hazards: s.hazards?.map(h => h.id === hazardId ? { ...h, risks: h.risks?.filter(r => r.id !== riskId) } : h) } : s) } : p);
    } else if (itemType === 'mitigation') {
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === phaseId ? { ...p, steps: p.steps?.map(s => s.id === stepId ? { ...s, hazards: s.hazards?.map(h => h.id === hazardId ? { ...h, risks: h.risks?.map(r => r.id === riskId ? { ...r, mitigations: r.mitigations?.filter(m => m.id !== mitigationId) } : r) } : h) } : s) } : p);
    }

    handleUpdate({ phases: updatedPhases });
    toast({ title: 'Item Deleted', description: 'The selected item has been removed.' });
  };
  
    const handleMitigationStatusChange = (newStatus: MocMitigation['status'], ids: Record<string, string>) => {
        if (!moc) return;
        const { phaseId, stepId, hazardId, riskId, mitigationId } = ids;
        let updatedPhases = JSON.parse(JSON.stringify(moc.phases || []));
        updatedPhases = updatedPhases.map((p: MocPhase) => p.id === phaseId 
            ? { ...p, steps: p.steps?.map(s => s.id === stepId 
                ? { ...s, hazards: s.hazards?.map(h => h.id === hazardId 
                    ? { ...h, risks: h.risks?.map(r => r.id === riskId 
                        ? { ...r, mitigations: r.mitigations?.map(m => m.id === mitigationId ? { ...m, status: newStatus } : m) } 
                        : r) } 
                    : h) } 
                : s) } 
            : p);
        handleUpdate({ phases: updatedPhases }, true);
    };

    const getStatusBadgeVariant = (status: MocMitigation['status']) => {
        switch (status) {
            case 'Open': return 'warning';
            case 'In Progress': return 'primary';
            case 'Closed': return 'success';
            default: return 'outline';
        }
    };

  const handleRequestProposerSignature = async () => {
    if (!moc || !company || !user) return;

    const proposer = personnel.find(p => p.name === moc.proposedBy);
    if (!proposer) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the proposer to send a notification.' });
        return;
    }

    const newAlert: Omit<Alert, 'id' | 'number'> = {
        companyId: company.id,
        type: 'Signature Request',
        title: `MOC Signature Required: ${moc.mocNumber}`,
        description: `Your signature is required on your proposal: "${moc.title}"`,
        author: user.name,
        date: new Date().toISOString(),
        readBy: [],
        targetUserId: proposer.id,
        relatedLink: `/safety/moc/${moc.id}`,
    };
    
    await addDoc(collection(db, `companies/${company.id}/alerts`), newAlert);
    toast({ title: 'Signature Request Sent', description: `A notification has been sent to ${proposer.name}.` });
  };


  if (loading || userLoading) return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>Loading MOC details...</p></main>;
  if (!moc) return <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>The requested Management of Change record could not be found.</p></main>;

  const canSignAsProposer = user?.name === moc.proposedBy;
  const canSignAsApprover = canEdit; // Simplified logic, could be a specific role

  return (
    <main className="flex-1 p-4 md:p-8 print:p-0">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between no-print">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to MOC List
            </Button>
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleRequestProposerSignature}><Edit className="mr-2 h-4 w-4" /> Request Signature</Button>
                <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            </div>
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
            </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-none">
            <CardHeader>
                <CardTitle>Hazard Analysis</CardTitle>
            </CardHeader>
            <CardContent>
                <RiskAssessmentTool readOnly={true} />
            </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle>Implementation Plan & Hazard Analysis</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-4 rounded-lg border p-4 no-print">
                    {canEdit && (<>
                        <Label htmlFor="analysis-params">AI Analysis Parameters (Optional)</Label>
                        <Textarea id="analysis-params" placeholder="Enter specific keywords for the AI to focus on, e.g., 'impact on flight crew duty times'..." value={analysisParams} onChange={(e) => setAnalysisParams(e.target.value)}/>
                        <div className="flex items-center gap-2 justify-end">
                            <Button variant="secondary" onClick={handleAnalyzeWithAi} disabled={isAiLoading}>{isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />} Analyze with AI</Button>
                        </div>
                    </>)}
                </div>

                <div className="space-y-6 pt-6">
                     {moc.phases?.map((phase, phaseIndex) => (
                         <Card key={phase.id} className="print:shadow-none print:border-none">
                             <CardHeader className="p-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{phaseIndex + 1}. {phase.description}</h3>
                                    {canEdit && <div className="flex items-center gap-2 no-print">
                                            <Button variant="ghost" size="icon" onClick={() => setDialogState({ type: 'editPhase', data: { phaseId: phase.id, description: phase.description }})}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete('phase', { phaseId: phase.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>}
                                </div>
                             </CardHeader>
                             <CardContent className="p-4 pt-0 space-y-4">
                                 {phase.steps?.map((step, stepIndex) => (
                                     <div key={step.id} className="p-3 border rounded-md">
                                         <div className="flex items-center gap-2"><p className="font-semibold">Step {phaseIndex + 1}.{stepIndex + 1}: {step.description}</p>
                                             {canEdit && <div className="flex items-center gap-1 no-print">
                                                 <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editStep', data: { phaseId: phase.id, stepId: step.id, description: step.description }})}><Edit className="h-3 w-3" /></Button>
                                                 <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('step', { phaseId: phase.id, stepId: step.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                             </div>}
                                         </div>
                                          {step.hazards?.map(hazard => (
                                             <div key={hazard.id} className="pl-4 pt-2 mt-2 border-t">
                                                 <div className="flex items-center gap-2 moc-print-hazard-title"><p className="font-semibold text-sm">Hazard: {hazard.description}</p>
                                                     {canEdit && <div className="flex items-center gap-1 no-print">
                                                         <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editHazard', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, description: hazard.description }})}><Edit className="h-3 w-3" /></Button>
                                                         <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('hazard', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                     </div>}
                                                 </div>
                                                 {hazard.risks?.map(risk => (
                                                 <div key={risk.id} className="pl-6 pt-2 mt-2 border-t border-dashed moc-print-risk-wrapper">
                                                     <div className="flex justify-between items-start">
                                                         <div className="flex items-center gap-2 moc-print-risk-title"><p className="text-sm">Risk: {risk.description}</p>
                                                             {canEdit && <div className="flex items-center gap-1 no-print">
                                                                 <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editRisk', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, risk } })}><Edit className="h-3 w-3" /></Button>
                                                                 <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('risk', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                             </div>}
                                                         </div>
                                                         <Badge className="font-mono print-force-color" style={{ backgroundColor: getRiskScoreColor(risk.likelihood, risk.severity, company?.riskMatrixColors), color: 'black' }}>{getAlphanumericCode(risk.likelihood, risk.severity)}</Badge>
                                                     </div>
                                                     {risk.mitigations?.map(mitigation => (
                                                        <div key={mitigation.id} className="pl-6 pt-2 mt-2 border-t border-dashed moc-print-mitigation-wrapper">
                                                            <div className="flex justify-between items-start gap-2">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-sm moc-print-mitigation-title">Mitigation: <span className="font-normal text-foreground">{mitigation.description}</span></p>
                                                                    <p className="text-xs text-muted-foreground">Responsible: {mitigation.responsiblePerson || 'N/A'}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {mitigation.residualLikelihood && mitigation.residualSeverity && (
                                                                        <Badge className="font-mono print-force-color" style={{ backgroundColor: getRiskScoreColor(mitigation.residualLikelihood, mitigation.residualSeverity, company?.riskMatrixColors), color: 'black' }}>
                                                                            {getAlphanumericCode(mitigation.residualLikelihood, mitigation.residualSeverity)}
                                                                        </Badge>
                                                                    )}
                                                                    {canEdit && (
                                                                        <div className="flex items-center gap-1 no-print">
                                                                            <Select value={mitigation.status} onValueChange={(value: MocMitigation['status']) => handleMitigationStatusChange(value, { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id, mitigationId: mitigation.id })}>
                                                                                <SelectTrigger className={cn("h-8 text-xs w-[130px]",
                                                                                    mitigation.status === 'Open' && 'bg-warning text-warning-foreground',
                                                                                    mitigation.status === 'In Progress' && 'bg-primary text-primary-foreground',
                                                                                    mitigation.status === 'Closed' && 'bg-success text-success-foreground'
                                                                                )}>
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                                                </SelectContent>
                                                                            </Select>
                                                                            <Button variant="link" className="p-0 h-4" onClick={() => setDialogState({ type: 'editMitigation', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id, mitigation } })}><Edit className="h-3 w-3" /></Button>
                                                                            <Button variant="link" className="p-0 h-4" onClick={() => handleDelete('mitigation', { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id, mitigationId: mitigation.id })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                     ))}
                                                      {canEdit && <div className="flex gap-2 mt-2 no-print"><Button variant="link" size="sm" onClick={() => setDialogState({ type: 'addMitigation', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id, riskId: risk.id }})}>Add Mitigation</Button></div>}
                                                 </div>
                                                 ))}
                                                 {canEdit && <div className="flex gap-2 mt-2 no-print"><Button variant="link" size="sm" onClick={() => setDialogState({ type: 'addRisk', data: { phaseId: phase.id, stepId: step.id, hazardId: hazard.id }})}>Add Risk</Button></div>}
                                             </div>
                                         ))}
                                         {canEdit && <div className="flex gap-2 mt-2 no-print"><Button variant="link" size="sm" onClick={() => setDialogState({ type: 'addHazard', data: { phaseId: phase.id, stepId: step.id }})}>Add Hazard</Button></div>}
                                     </div>
                                 ))}
                                 {canEdit && <div className="flex justify-end mt-4 no-print"><Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'addStep', data: { phaseId: phase.id }})}>Add Step</Button></div>}
                             </CardContent>
                         </Card>
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

        <Card>
            <CardHeader>
                <CardTitle>Signatures</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <h4 className="font-semibold">Proposer: {moc.proposedBy}</h4>
                    {moc.proposerSignature && moc.proposerSignature.signature ? (
                        <div>
                            <Image src={moc.proposerSignature.signature} alt="Proposer Signature" width={300} height={150} className="rounded-md border bg-white"/>
                            {moc.proposerSignature.date && (
                                <p className="text-xs text-muted-foreground mt-1">Signed by {moc.proposedBy} on: {format(parseISO(moc.proposerSignature.date), 'PPP p')}</p>
                            )}
                        </div>
                    ) : canSignAsProposer ? (
                        <SignaturePad onSubmit={(signature) => handleUpdate({ proposerSignature: { signature, date: new Date().toISOString() } }, true)} />
                    ) : (
                        <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
                    )}
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold">Approver: {moc.approverName || 'Not Assigned'}</h4>
                    {moc.approverSignature && moc.approverSignature.signature ? (
                        <div>
                            <Image src={moc.approverSignature.signature} alt="Approver Signature" width={300} height={150} className="rounded-md border bg-white"/>
                            {moc.approverSignature.date && (
                                <p className="text-xs text-muted-foreground mt-1">Signed by {moc.approverName} on: {format(parseISO(moc.approverSignature.date), 'PPP p')}</p>
                            )}
                        </div>
                    ) : canSignAsApprover ? (
                        <SignaturePad onSubmit={(signature) => handleUpdate({ approverName: user?.name, approverSignature: { signature, date: new Date().toISOString() } }, true)} />
                    ) : (
                        <div className="h-[150px] w-full max-w-sm flex items-center justify-center border rounded-md bg-muted text-muted-foreground">Awaiting signature</div>
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
                {dialogState?.type === 'addMitigation' && <MitigationForm onSubmit={handleDialogSubmit} personnel={personnel} />}
                {dialogState?.type === 'editMitigation' && <MitigationForm onSubmit={handleDialogSubmit} mitigation={dialogState.data.mitigation} personnel={personnel} />}
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

const mitigationFormSchema = z.object({ description: z.string().min(1, 'Description is required'), residualLikelihood: z.enum(probabilityOptions), residualSeverity: z.enum(severityOptions), responsiblePerson: z.string().optional(), completionDate: z.date().optional(), status: z.enum(['Open', 'In Progress', 'Closed']).default('Open') });
const MitigationForm = ({ onSubmit, mitigation, personnel }: { onSubmit: (data: any) => void, mitigation?: MocMitigation, personnel: User[] }) => {
    const form = useForm<z.infer<typeof mitigationFormSchema>>({ resolver: zodResolver(mitigationFormSchema), defaultValues: mitigation ? { ...mitigation, completionDate: mitigation.completionDate ? parseISO(mitigation.completionDate) : undefined } : { responsiblePerson: '', status: 'Open' } });
    return (<Form {...form}><form onSubmit={form.handleSubmit((data) => onSubmit({...data, completionDate: data.completionDate ? format(data.completionDate, 'yyyy-MM-dd') : undefined }))} className="space-y-4 py-4"><FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Mitigation Action</FormLabel><FormControl><Textarea placeholder="Describe the mitigation..." {...field} /></FormControl><FormMessage /></FormItem>)} /><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="residualLikelihood" render={({ field }) => (<FormItem><FormLabel>Residual Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Likelihood" /></SelectTrigger><SelectContent>{probabilityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="residualSeverity" render={({ field }) => (<FormItem><FormLabel>Residual Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select Severity" /></SelectTrigger><SelectContent>{severityOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /></div><div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="responsiblePerson" render={({ field }) => (<FormItem><FormLabel>Responsible Person</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="completionDate" render={({ field }) => (<FormItem><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} /></div><DialogFooter><Button type="submit">Save Mitigation</Button></DialogFooter></form></Form>);
};

MocDetailPage.title = "Management of Change";
