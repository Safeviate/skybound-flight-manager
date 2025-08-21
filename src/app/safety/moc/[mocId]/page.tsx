

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocStep, MocHazard, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit, Trash2, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { getRiskScore, getRiskScoreColor, getRiskLevel } from '@/lib/utils';
import { RiskAssessmentTool } from '../../[reportId]/risk-assessment-tool';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const likelihoodValues: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityValues: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];


const stepFormSchema = z.object({
  description: z.string().min(10, "Step description must be at least 10 characters."),
});
type StepFormValues = z.infer<typeof stepFormSchema>;

const hazardFormSchema = z.object({
  description: z.string().min(10, "Hazard description is required."),
  risk: z.string().min(10, "Risk description is required."),
  mitigation: z.string().min(10, "Mitigation plan is required."),
  likelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.' }),
  severity: z.enum(severityValues, { required_error: 'Severity is required.' }),
  residualLikelihood: z.enum(likelihoodValues, { required_error: 'Residual Likelihood is required.' }),
  residualSeverity: z.enum(severityValues, { required_error: 'Residual Severity is required.' }),
  responsiblePerson: z.string().optional(),
  completionDate: z.date().optional().nullable(),
});
type HazardFormValues = z.infer<typeof hazardFormSchema>;


const HazardDialog = ({ step, onSave, onCancel }: { step: MocStep, onSave: (updatedHazards: MocStep['hazards']) => void, onCancel: () => void }) => {
    const [hazards, setHazards] = useState(step.hazards || []);
    const [editingHazard, setEditingHazard] = useState<MocHazard | null>(null);
    const form = useForm<HazardFormValues>({
        resolver: zodResolver(hazardFormSchema),
    });

    useEffect(() => {
        if (editingHazard) {
            form.reset({
                ...editingHazard,
                completionDate: editingHazard.completionDate ? parseISO(editingHazard.completionDate) : null,
            });
        } else {
            form.reset({ description: '', risk: '', mitigation: '' });
        }
    }, [editingHazard, form]);
    
    const watchedLikelihood = form.watch('likelihood');
    const watchedSeverity = form.watch('severity');
    const watchedResidualLikelihood = form.watch('residualLikelihood');
    const watchedResidualSeverity = form.watch('residualSeverity');

    const initialRiskScore = watchedLikelihood && watchedSeverity ? getRiskScore(watchedLikelihood, watchedSeverity) : null;
    const residualRiskScore = watchedResidualLikelihood && watchedResidualSeverity ? getRiskScore(watchedResidualLikelihood, watchedResidualSeverity) : null;

    const handleAddOrUpdate = (data: HazardFormValues) => {
        const riskScore = data.likelihood && data.severity ? getRiskScore(data.likelihood, data.severity) : undefined;
        const residualRiskScore = data.residualLikelihood && data.residualSeverity ? getRiskScore(data.residualLikelihood, data.residualSeverity) : undefined;

        const hazardData = { 
            ...data, 
            completionDate: data.completionDate ? format(data.completionDate, 'yyyy-MM-dd') : undefined,
            riskScore, 
            residualRiskScore 
        };

        let updatedHazards;
        if (editingHazard) {
            updatedHazards = hazards.map(h => h.id === editingHazard.id ? { ...h, ...hazardData } : h);
        } else {
            updatedHazards = [...hazards, { ...hazardData, id: `haz-${Date.now()}` }];
        }
        setHazards(updatedHazards);
        setEditingHazard(null);
    };
    
    const handleDelete = (hazardId: string) => {
        setHazards(hazards.filter(h => h.id !== hazardId));
    };

    return (
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>Hazard Analysis for Step: "{step.description}"</DialogTitle>
                <DialogDescription>Identify and mitigate hazards for this specific step of the change.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh]">
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm">Identified Hazards</h4>
                    <ScrollArea className="h-full">
                        <div className="space-y-2 pr-4">
                            {hazards.map(h => (
                                <div key={h.id} className="p-2 border rounded-md flex justify-between items-center">
                                    <p className="text-sm">{h.description}</p>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingHazard(h)}><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(h.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                </div>
                            ))}
                            {hazards.length === 0 && <p className="text-xs text-muted-foreground">No hazards identified yet.</p>}
                        </div>
                    </ScrollArea>
                </div>
                <ScrollArea className="h-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddOrUpdate)} className="space-y-4 p-4 border rounded-lg">
                        <h4 className="font-semibold text-sm">{editingHazard ? 'Edit' : 'Add'} Hazard</h4>
                        <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Hazard</FormLabel><FormControl><Textarea placeholder="e.g., Incorrect fuel calculation" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="risk" control={form.control} render={({ field }) => (<FormItem><FormLabel>Risk</FormLabel><FormControl><Textarea placeholder="e.g., Engine failure due to fuel exhaustion." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <div className="p-3 border rounded-md space-y-3">
                            <h5 className="text-sm font-semibold">Initial Risk Assessment</h5>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField name="likelihood" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{likelihoodValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField name="severity" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{severityValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                             {initialRiskScore !== null && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span>Calculated Risk:</span>
                                    <Badge style={{ backgroundColor: getRiskScoreColor(initialRiskScore), color: 'white' }}>{initialRiskScore}</Badge>
                                    <Badge variant="outline">{getRiskLevel(initialRiskScore)}</Badge>
                                </div>
                            )}
                        </div>

                        <FormField name="mitigation" control={form.control} render={({ field }) => (<FormItem><FormLabel>Mitigation</FormLabel><FormControl><Textarea placeholder="e.g., Mandatory cross-check by second crew member..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <div className="p-3 border rounded-md space-y-3">
                            <h5 className="text-sm font-semibold">Residual Risk Assessment</h5>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField name="residualLikelihood" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{likelihoodValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField name="residualSeverity" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent>{severityValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            {residualRiskScore !== null && (
                                <div className="flex items-center gap-2 text-sm">
                                    <span>Calculated Risk:</span>
                                    <Badge style={{ backgroundColor: getRiskScoreColor(residualRiskScore), color: 'white' }}>{residualRiskScore}</Badge>
                                    <Badge variant="outline">{getRiskLevel(residualRiskScore)}</Badge>
                                </div>
                            )}
                        </div>
                        <div className="p-3 border rounded-md space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField name="responsiblePerson" control={form.control} render={({ field }) => (<FormItem><FormLabel>Responsible Person</FormLabel><FormControl><Input placeholder="e.g., Safety Manager" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField name="completionDate" control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} >{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                          </div>
                        </div>

                        
                        <div className="flex justify-end gap-2">
                            {editingHazard && <Button type="button" variant="ghost" onClick={() => setEditingHazard(null)}>Cancel Edit</Button>}
                            <Button type="submit">{editingHazard ? 'Save Changes' : 'Add Hazard'}</Button>
                        </div>
                    </form>
                </Form>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onSave(hazards)}>Save All Changes to Step</Button>
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
  
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<MocStep | null>(null);
  
  const [isHazardDialogOpen, setIsHazardDialogOpen] = useState(false);
  const [stepForHazardAnalysis, setStepForHazardAnalysis] = useState<MocStep | null>(null);

  const stepForm = useForm<StepFormValues>({ resolver: zodResolver(stepFormSchema) });

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
  
  const handleUpdate = async (updatedData: Partial<ManagementOfChange>) => {
      if (!moc) return;
      const mocRef = doc(db, `companies/${company?.id}/management-of-change`, moc.id);
      try {
          await updateDoc(mocRef, updatedData);
          setMoc(prev => prev ? { ...prev, ...updatedData } : null);
          toast({ title: 'MOC Updated', description: 'Your changes have been saved.'});
      } catch (error) {
          console.error("Failed to update MOC:", error);
          toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes.' });
      }
  };

  const handleStepSubmit = (data: StepFormValues) => {
    let updatedSteps;
    if (editingStep) {
        updatedSteps = (moc?.steps || []).map(s => s.id === editingStep.id ? { ...s, ...data } : s);
    } else {
        const newStep: MocStep = { ...data, id: `step-${Date.now()}` };
        updatedSteps = [...(moc?.steps || []), newStep];
    }
    handleUpdate({ steps: updatedSteps });
    setIsStepDialogOpen(false);
    setEditingStep(null);
  };
  
  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = moc?.steps?.filter(s => s.id !== stepId);
    handleUpdate({ steps: updatedSteps });
  };
  
  const handleSaveHazards = (stepId: string, updatedHazards: MocStep['hazards']) => {
      const updatedSteps = moc?.steps?.map(s => s.id === stepId ? { ...s, hazards: updatedHazards } : s);
      handleUpdate({ steps: updatedSteps });
      setIsHazardDialogOpen(false);
      setStepForHazardAnalysis(null);
  }

  const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-1">
        <h4 className="font-semibold text-muted-foreground text-sm">{title}</h4>
        <div className="p-3 bg-muted/50 rounded-md text-sm">{children}</div>
    </div>
  );

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
      <div className="max-w-4xl mx-auto space-y-6">
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
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>Change Implementation Steps</CardTitle>
                    <CardDescription>Break down the change into actionable steps and analyze hazards for each.</CardDescription>
                </div>
                {canEdit && (
                <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingStep(null)}><PlusCircle className="mr-2 h-4 w-4"/> Add Step</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStep ? 'Edit' : 'Add'} Step</DialogTitle>
                        </DialogHeader>
                         <Form {...stepForm}>
                            <form onSubmit={stepForm.handleSubmit(handleStepSubmit)} className="space-y-4">
                                <FormField name="description" control={stepForm.control} render={({ field }) => (<FormItem><FormLabel>Step Description</FormLabel><FormControl><Textarea placeholder="e.g., Procure and install new GPS units..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <DialogFooter><Button type="submit">Save Step</Button></DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {moc.steps?.map((step, index) => (
                    <div key={step.id} className="p-4 border rounded-md">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h4 className="font-semibold">{index + 1}. {step.description}</h4>
                                <div className="mt-2 space-y-2">
                                    {step.hazards?.map(hazard => (
                                        <div key={hazard.id} className="p-2 bg-muted/50 rounded-md">
                                            <p className="font-semibold text-xs text-destructive">Hazard: {hazard.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Risk: {hazard.risk}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                                                <div>
                                                    <p className="font-semibold">Mitigation:</p>
                                                    <p>{hazard.mitigation}</p>
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Responsible:</p>
                                                    <p>{hazard.responsiblePerson || 'N/A'}</p>
                                                    <p className="font-semibold mt-1">Due Date:</p>
                                                    <p>{hazard.completionDate ? format(parseISO(hazard.completionDate), 'PPP') : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t">
                                                <span>Risk Score:</span>
                                                <Badge style={{ backgroundColor: getRiskScoreColor(hazard.riskScore), color: 'white' }}>
                                                    {hazard.riskScore || 'N/A'}
                                                </Badge>
                                                <ArrowRight className="h-3 w-3" />
                                                <Badge style={{ backgroundColor: getRiskScoreColor(hazard.residualRiskScore), color: 'white' }}>
                                                    {hazard.residualRiskScore !== undefined ? hazard.residualRiskScore : 'N/A'}
                                                </Badge>
                                                <span className="font-semibold pl-2">{getRiskLevel(hazard.residualRiskScore ?? hazard.riskScore)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {canEdit && (
                            <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => { setStepForHazardAnalysis(step); setIsHazardDialogOpen(true); }}>Analyze Hazards</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingStep(step); stepForm.reset({ description: step.description }); setIsStepDialogOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteStep(step.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </div>
                            )}
                        </div>
                    </div>
                ))}
                {(!moc.steps || moc.steps.length === 0) && <p className="text-sm text-center text-muted-foreground py-4">No implementation steps have been added yet.</p>}
            </CardContent>
        </Card>
        
        {stepForHazardAnalysis && (
            <Dialog open={isHazardDialogOpen} onOpenChange={setIsHazardDialogOpen}>
                <HazardDialog
                    step={stepForHazardAnalysis}
                    onSave={(updatedHazards) => handleSaveHazards(stepForHazardAnalysis.id, updatedHazards)}
                    onCancel={() => setIsHazardDialogOpen(false)}
                />
            </Dialog>
        )}
      </div>
    </main>
  );
}
