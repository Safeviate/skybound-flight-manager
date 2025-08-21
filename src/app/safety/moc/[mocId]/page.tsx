

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ManagementOfChange, MocStep, MocHazard, RiskLikelihood, RiskSeverity, MocRisk, MocMitigation } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const stepFormSchema = z.object({
  description: z.string().min(10, "Step description is required."),
});
type StepFormValues = z.infer<typeof stepFormSchema>;


const likelihoodValues: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityValues: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];


const riskSchema = z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description cannot be empty.'),
    likelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.' }),
    severity: z.enum(severityValues, { required_error: 'Severity is required.' }),
    initialRiskScore: z.number().optional(),
});

const mitigationSchema = z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description cannot be empty.'),
    responsiblePerson: z.string().optional(),
    completionDate: z.date().optional().nullable(),
    residualLikelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.' }),
    residualSeverity: z.enum(severityValues, { required_error: 'Severity is required.' }),
    residualRiskScore: z.number().optional(),
});

const hazardFormSchema = z.object({
  description: z.string().min(10, "Hazard description is required."),
  risks: z.array(riskSchema).optional(),
  mitigations: z.array(mitigationSchema).optional(),
});
type HazardFormValues = z.infer<typeof hazardFormSchema>;


const HazardDialog = ({ step, onSave, onCancel }: { step: MocStep, onSave: (updatedHazards: MocStep['hazards']) => void, onCancel: () => void }) => {
    const [hazards, setHazards] = useState(step.hazards || []);
    const [editingHazard, setEditingHazard] = useState<MocHazard | null>(null);

    const form = useForm<HazardFormValues>({
        resolver: zodResolver(hazardFormSchema),
    });

     const { fields: riskFields, append: appendRisk, remove: removeRisk } = useFieldArray({
        control: form.control,
        name: 'risks'
    });
    const { fields: mitigationFields, append: appendMitigation, remove: removeMitigation } = useFieldArray({
        control: form.control,
        name: 'mitigations'
    });

    useEffect(() => {
        if (editingHazard) {
            form.reset({
                description: editingHazard.description,
                risks: editingHazard.risks || [],
                mitigations: editingHazard.mitigations?.map(m => ({
                    ...m,
                    completionDate: m.completionDate ? parseISO(m.completionDate) : null,
                })) || []
            });
        } else {
            form.reset({ description: '', risks: [], mitigations: [] });
        }
    }, [editingHazard, form]);

    const handleAddOrUpdate = (data: HazardFormValues) => {
        const hazardData: MocHazard = {
            id: editingHazard?.id || `haz-${Date.now()}`,
            description: data.description,
            risks: (data.risks || []).map(r => ({
                ...r,
                id: r.id || `risk-${Date.now()}`,
                initialRiskScore: getRiskScore(r.likelihood, r.severity),
            })),
            mitigations: (data.mitigations || []).map(m => ({
                ...m,
                id: m.id || `mit-${Date.now()}`,
                completionDate: m.completionDate ? format(m.completionDate, 'yyyy-MM-dd') : undefined,
                residualRiskScore: getRiskScore(m.residualLikelihood, m.residualSeverity),
            })),
        };

        let updatedHazards;
        if (editingHazard) {
            updatedHazards = hazards.map(h => h.id === editingHazard.id ? hazardData : h);
        } else {
            updatedHazards = [...hazards, hazardData];
        }
        setHazards(updatedHazards);
        setEditingHazard(null);
    };
    
    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Hazard Analysis for Step: "{step.description}"</DialogTitle>
                <DialogDescription>Identify and mitigate hazards for this specific step of the change.</DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh]">
                <ScrollArea className="h-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddOrUpdate)} className="space-y-4 p-1">
                        <h4 className="font-semibold text-sm">Add Hazard</h4>
                        <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>Potential Hazard</FormLabel><FormControl><Textarea placeholder="e.g., Loss of Institutional Knowledge" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        
                        <Separator />
                        <h5 className="font-semibold text-sm">Associated Risks</h5>
                         {riskFields.map((field, index) => (
                             <div key={field.id} className="p-3 border rounded-md space-y-2 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeRisk(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                <FormField name={`risks.${index}.description`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Risk Description</FormLabel><FormControl><Textarea placeholder="Describe the risk..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-2 gap-4">
                                     <FormField name={`risks.${index}.likelihood`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{likelihoodValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                     <FormField name={`risks.${index}.severity`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{severityValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                </div>
                             </div>
                         ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => appendRisk({ description: '', likelihood: 'Remote', severity: 'Minor' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Risk</Button>
                        
                        <Separator />
                        <h5 className="font-semibold text-sm">Mitigation Actions</h5>
                        {mitigationFields.map((field, index) => (
                             <div key={field.id} className="p-3 border rounded-md space-y-2 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeMitigation(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                <FormField name={`mitigations.${index}.description`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Mitigation Description</FormLabel><FormControl><Textarea placeholder="Describe the mitigation..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                
                                <div className="p-3 border rounded-md bg-muted/50">
                                    <Label className="text-xs font-semibold">Residual Risk Assessment</Label>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        <FormField name={`mitigations.${index}.residualLikelihood`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Likelihood</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{likelihoodValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                        <FormField name={`mitigations.${index}.residualSeverity`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Severity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{severityValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name={`mitigations.${index}.responsiblePerson`} control={form.control} render={({ field }) => (<FormItem><FormLabel>Responsible Person</FormLabel><FormControl><Input placeholder="e.g., Safety Manager" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField name={`mitigations.${index}.completionDate`} control={form.control} render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Completion Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} >{field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                 </div>
                             </div>
                         ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => appendMitigation({ description: '', residualLikelihood: 'Improbable', residualSeverity: 'Negligible' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Mitigation</Button>
                        
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="submit">Add Hazard</Button>
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
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-start">
            <Button variant="outline" onClick={() => router.push('/safety?tab=moc')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to MOC List
            </Button>
        </div>
        <div className="border-4 border-blue-500 p-4 rounded-lg relative">
            <div className="absolute -top-3 left-4 bg-background px-2 text-blue-500 font-semibold text-sm">Step 1: Change Proposal</div>
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
        </div>
        
        <div className="border-4 border-purple-600 p-4 rounded-lg relative">
            <div className="absolute -top-3 left-4 bg-background px-2 text-purple-600 font-semibold text-sm">Step 2: Implementation Plan & Hazard Analysis</div>
             <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle>Change Implementation Plan</CardTitle>
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
                <CardContent>
                  <div className="space-y-4">
                      {moc.steps && moc.steps.length > 0 ? (
                          moc.steps.map((step, index) => (
                              <Card key={step.id}>
                                  <CardHeader>
                                      <div className="flex justify-between items-center">
                                          <CardTitle className="text-lg">Phase {index+1}: {step.description}</CardTitle>
                                          {canEdit && (
                                              <div className="flex items-center gap-1">
                                                  <Button size="sm" variant="outline" onClick={() => { setStepForHazardAnalysis(step); setIsHazardDialogOpen(true); }}>Analyze Hazards</Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStep(step); setIsStepDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteStep(step.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                              </div>
                                          )}
                                      </div>
                                  </CardHeader>
                              </Card>
                          ))
                      ) : (
                          <p className="text-sm text-muted-foreground">No implementation steps added yet.</p>
                      )}
                  </div>
                </CardContent>
            </Card>
        </div>

        <div className="border-4 border-green-600 p-4 rounded-lg relative">
             <div className="absolute -top-3 left-4 bg-background px-2 text-green-600 font-semibold text-sm">Step 3: Final Review & Approval</div>
             <Card>
                 <CardHeader>
                     <CardTitle>Review & Sign-off</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground">This section will contain fields for final review, approval, and sign-off by relevant managers once the implementation plan is complete.</p>
                 </CardContent>
             </Card>
        </div>
        
        {stepForHazardAnalysis && (
            <Dialog open={isHazardDialogOpen} onOpenChange={setIsHazardDialogOpen}>
                <HazardDialog
                    step={stepForHazardAnalysis}
                    onSave={(updatedHazards) => handleSaveHazards(stepForHazardAnalysis!.id, updatedHazards)}
                    onCancel={() => setIsHazardDialogOpen(false)}
                />
            </Dialog>
        )}
      </div>
    </main>
  );
}

MocDetailPage.title = "Management of Change";
