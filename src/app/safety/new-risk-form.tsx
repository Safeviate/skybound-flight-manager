
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
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const hazardAreas = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];

const riskFormSchema = z.object({
  hazard: z.string().min(10, { message: 'Hazard description must be at least 10 characters long.' }),
  risk: z.string().min(10, { message: 'Risk description must be at least 10 characters long.' }),
  description: z.string().optional(),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
  likelihood: z.custom<RiskLikelihood>(val => typeof val === 'string', 'Likelihood is required.'),
  severity: z.custom<RiskSeverity>(val => typeof val === 'string', 'Severity is required.'),
  mitigation: z.string().min(10, { message: 'Mitigation must be at least 10 characters long.' }),
  riskOwner: z.string().optional(),
  status: z.enum(['Open', 'Mitigated', 'Closed']),
});

type RiskFormValues = z.infer<typeof riskFormSchema>;

interface NewRiskFormProps {
    onSubmit: (data: Omit<Risk, 'id' | 'companyId'>) => void;
    existingRisk?: Risk | null;
}

export function NewRiskForm({ onSubmit, existingRisk }: NewRiskFormProps) {
  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskFormSchema),
    defaultValues: existingRisk || {
        status: 'Open',
    },
  });

  const handleAssessmentChange = (likelihood: RiskLikelihood | null, severity: RiskSeverity | null) => {
    if (likelihood) form.setValue('likelihood', likelihood);
    if (severity) form.setValue('severity', severity);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                    onAssessmentChange={handleAssessmentChange} 
                    showResultCard={false}
                    initialLikelihood={form.getValues('likelihood')}
                    initialSeverity={form.getValues('severity')}
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


        <div className="flex justify-end pt-4">
          <Button type="submit">{existingRisk ? 'Save Changes' : 'Add Risk'}</Button>
        </div>
      </form>
    </Form>
  );
}
