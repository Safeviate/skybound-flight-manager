
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { Risk, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { useState, useEffect } from 'react';
import { RiskAssessmentTool } from './[reportId]/risk-assessment-tool';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getRiskScore } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const hazardAreas = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];
const processes = [
    'AB Initio Training',
    'Advanced Training',
    'Aerobatics',
    'Airfield Operations',
    'Aircraft Ferry',
    'Cabin Safety Procedures',
    'Charter Operations',
    'Cross-Country Flight',
    'Emergency Procedures Training',
    'Flight Dispatch',
    'Ground Handling',
    'Hangar Operations',
    'Instrument Flight Rules (IFR) Ops',
    'Instrument Training',
    'Line Maintenance',
    'Night Flying',
    'Passenger Briefing',
    'Passenger Transport',
    'Ramp Operations',
    'Refueling',
    'Scheduled Maintenance',
    'Security Procedures',
    'Short Field Landings',
    'Solo Flight Operations',
    'Specialized Operations',
    'Taxiing',
    'Towing',
    'Unscheduled Maintenance',
    'Visual Flight Rules (VFR) Ops',
    'Other'
];

const likelihoodValues: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityValues: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];

const riskFormSchema = z.object({
  hazard: z.string().min(10, { message: 'Hazard description must be at least 10 characters long.' }),
  risk: z.string().min(10, { message: 'Risk description must be at least 10 characters long.' }),
  description: z.string().optional(),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
  likelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.'}),
  severity: z.enum(severityValues, { required_error: 'Severity is required.'}),
  mitigation: z.string().min(10, { message: 'Mitigation must be at least 10 characters long.' }),
  riskOwner: z.string().optional(),
  status: z.enum(['Open', 'Mitigated', 'Closed']),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

interface NewRiskFormProps {
    onSubmit: (data: Omit<Risk, 'id' | 'companyId'>) => void;
    existingRisk?: Risk | null;
}

const severityMap: Record<RiskSeverity, string> = { 'Catastrophic': 'A', 'Hazardous': 'B', 'Major': 'C', 'Minor': 'D', 'Negligible': 'E' };
const likelihoodMap: Record<RiskLikelihood, number> = { 'Frequent': 5, 'Occasional': 4, 'Remote': 3, 'Improbable': 2, 'Extremely Improbable': 1 };


export function NewRiskForm({ onSubmit, existingRisk }: NewRiskFormProps) {
  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: existingRisk || {
        status: 'Open',
    },
  });

  const watchedLikelihood = form.watch('likelihood');
  const watchedSeverity = form.watch('severity');

  const handleAssessmentChange = (likelihood: RiskLikelihood, severity: RiskSeverity) => {
    form.setValue('likelihood', likelihood, { shouldValidate: true });
    form.setValue('severity', severity, { shouldValidate: true });
  };

  function handleFormSubmit(data: RiskFormValues) {
    const riskScore = getRiskScore(data.likelihood, data.severity);
    const dateIdentified = existingRisk?.dateIdentified || new Date().toISOString().split('T')[0];
    
    onSubmit({
        ...data,
        riskScore,
        dateIdentified,
        consequences: [data.risk], // Simple mapping for now
    } as Omit<Risk, 'id' | 'companyId'>);
  }

  const getSelectedCode = () => {
    if (watchedLikelihood && watchedSeverity) {
        return `${likelihoodMap[watchedLikelihood]}${severityMap[watchedSeverity]}`;
    }
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-4">
                <FormField
                control={form.control}
                name="hazard"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hazard</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe the condition with potential to cause harm..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="risk"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Associated Risk</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe the potential negative consequence..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="hazardArea"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Hazard Area</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an area" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {hazardAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="process"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Process / Activity</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a process" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {processes.map(proc => <SelectItem key={proc} value={proc}>{proc}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Initial Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RiskAssessmentTool
                            onCellClick={handleAssessmentChange}
                            selectedCode={getSelectedCode()}
                        />
                        {form.formState.errors.likelihood && <FormMessage>{form.formState.errors.likelihood.message}</FormMessage>}
                        {form.formState.errors.severity && <FormMessage>{form.formState.errors.severity.message}</FormMessage>}
                    </CardContent>
                </Card>

                <FormField
                control={form.control}
                name="mitigation"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mitigation Controls</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Describe the controls in place or proposed..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-2 gap-4">
                <FormField
                        control={form.control}
                        name="riskOwner"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Risk Owner (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Safety Manager" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="Mitigated">Mitigated</SelectItem>
                                    <SelectItem value="Closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit">{existingRisk ? 'Save Changes' : 'Add Risk'}</Button>
        </div>
      </form>
    </Form>
  );
}
