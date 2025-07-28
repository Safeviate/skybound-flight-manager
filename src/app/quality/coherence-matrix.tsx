
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Risk, SafetyObjective, AuditArea } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc } from 'firebase/firestore';
import { getRiskScoreColor, getRiskLevel } from '@/lib/utils.tsx';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SpiConfig } from '@/app/safety/page'; // Assuming SpiConfig is exported

const auditAreas: AuditArea[] = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

const objectiveFormSchema = z.object({
  objective: z.string().min(10, 'Objective must be at least 10 characters.'),
  target: z.string().min(3, 'Target is required.'),
  relatedHazardArea: z.custom<AuditArea>(),
});

type ObjectiveFormValues = z.infer<typeof objectiveFormSchema>;

interface AddObjectiveFormProps {
  onSubmit: (data: Omit<SafetyObjective, 'id'|'companyId'>) => void;
}

const AddObjectiveForm = ({ onSubmit }: AddObjectiveFormProps) => {
    const form = useForm<ObjectiveFormValues>({
        resolver: zodResolver(objectiveFormSchema),
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Safety Objective</FormLabel>
                            <FormControl><Input placeholder="e.g., Reduce runway excursions" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="target"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target</FormLabel>
                            <FormControl><Input placeholder="e.g., By 15% in 2024" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="relatedHazardArea"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Related Hazard Area</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an area" /></SelectTrigger></FormControl>
                            <SelectContent>{auditAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end pt-2">
                    <Button type="submit">Add Objective</Button>
                </div>
            </form>
        </Form>
    );
};

export function CoherenceMatrix() {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [objectives, setObjectives] = React.useState<SafetyObjective[]>([]);
    const [risks, setRisks] = React.useState<Risk[]>([]);
    const [spis, setSpis] = React.useState<SpiConfig[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);

    React.useEffect(() => {
        if (!company) return;

        const fetchData = async () => {
            try {
                const objectivesQuery = query(collection(db, `companies/${company.id}/safety-objectives`));
                const risksQuery = query(collection(db, `companies/${company.id}/risks`));

                const [objSnapshot, risksSnapshot] = await Promise.all([
                    getDocs(objectivesQuery),
                    getDocs(risksQuery),
                ]);

                setObjectives(objSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SafetyObjective)));
                setRisks(risksSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Risk)));
                // In a real app, SPIs would also be fetched from a database.
                // For now, we'll use a placeholder or assume they are static config.
            } catch (error) {
                console.error("Error fetching coherence matrix data:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load data for matrix.'});
            }
        };

        fetchData();
    }, [company, toast]);
    
    const handleAddObjective = async (data: Omit<SafetyObjective, 'id'|'companyId'>) => {
        if (!company) return;

        const newObjective = { ...data, companyId: company.id };
        try {
            const docRef = await addDoc(collection(db, `companies/${company.id}/safety-objectives`), newObjective);
            setObjectives(prev => [...prev, { ...newObjective, id: docRef.id }]);
            toast({ title: "Objective Added" });
            setIsDialogOpen(false);
        } catch(e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save objective.' });
        }
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-start">
                <div>
                    <CardTitle>SMS Coherence Matrix</CardTitle>
                    <CardDescription>
                        Mapping the connections between safety objectives, risks, and performance indicators.
                    </CardDescription>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                         <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Add Safety Objective</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Safety Objective</DialogTitle>
                        </DialogHeader>
                        <AddObjectiveForm onSubmit={handleAddObjective} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/4">Safety Objective & Target</TableHead>
                            <TableHead className="w-1/4">Related Risks</TableHead>
                            <TableHead className="w-1/4">Mitigation / Controls</TableHead>
                            <TableHead className="w-1/4">Safety Performance Indicators (SPIs)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {objectives.length > 0 ? objectives.map(obj => {
                            const relatedRisks = risks.filter(r => r.hazardArea === obj.relatedHazardArea);
                            return (
                                <TableRow key={obj.id} className="align-top">
                                    <TableCell>
                                        <p className="font-semibold">{obj.objective}</p>
                                        <p className="text-sm text-muted-foreground">Target: {obj.target}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            {relatedRisks.map(risk => (
                                                 <div key={risk.id} className="flex items-center gap-2">
                                                    <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                                        {getRiskLevel(risk.riskScore)}
                                                    </Badge>
                                                    <p className="text-sm">{risk.hazard}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <ul className="list-disc list-inside text-sm space-y-1">
                                            {relatedRisks.map(risk => (
                                                <li key={risk.id}>{risk.mitigation}</li>
                                            ))}
                                        </ul>
                                    </TableCell>
                                    <TableCell>
                                        {/* This part is illustrative as SPIs are not fully dynamic yet */}
                                        <p className="text-sm">Unstable Approach Rate</p>
                                        <p className="text-sm">Incident Rate per 1000 hours</p>
                                    </TableCell>
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No safety objectives defined. Add one to begin.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
