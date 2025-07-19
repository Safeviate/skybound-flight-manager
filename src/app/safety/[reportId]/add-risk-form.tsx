
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
import type { AssociatedRisk, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { useState } from 'react';
import { RiskAssessmentTool } from '../risk-assessment-tool';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const addRiskFormSchema = z.object({
  hazard: z.string().min(10, {
    message: 'Hazard description must be at least 10 characters long.',
  }),
  risk: z.string().min(10, {
    message: 'Risk description must be at least 10 characters long.',
  }),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
  likelihood: z.custom<RiskLikelihood>(val => typeof val === 'string', 'Likelihood is required.'),
  severity: z.custom<RiskSeverity>(val => typeof val === 'string', 'Severity is required.'),
});

type AddRiskFormValues = z.infer<typeof addRiskFormSchema>;

interface AddRiskFormProps {
    onAddRisk: (newRisk: Omit<AssociatedRisk, 'id'>) => void;
}

const hazardAreas = ['Flight Operations', 'Maintenance', 'Ground Operations', 'Administration'];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];

export function AddRiskForm({ onAddRisk }: AddRiskFormProps) {
  const form = useForm<AddRiskFormValues>({
    resolver: zodResolver(addRiskFormSchema),
  });

  const handleAssessmentChange = (likelihood: RiskLikelihood | null, severity: RiskSeverity | null) => {
    if (likelihood) form.setValue('likelihood', likelihood);
    if (severity) form.setValue('severity', severity);
  };

  function onSubmit(data: AddRiskFormValues) {
    onAddRisk(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="hazard"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hazard Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the identified hazard..."
                  {...field}
                />
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
                <Textarea
                  placeholder="Describe the potential risk resulting from this hazard..."
                  {...field}
                />
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
            <CardContent className="pt-6">
                 <RiskAssessmentTool onAssessmentChange={handleAssessmentChange} showResultCard={false} />
                 {form.formState.errors.likelihood && <FormMessage>{form.formState.errors.likelihood.message}</FormMessage>}
                 {form.formState.errors.severity && <FormMessage>{form.formState.errors.severity.message}</FormMessage>}
            </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit">Add Hazard to Register</Button>
        </div>
      </form>
    </Form>
  );
}
