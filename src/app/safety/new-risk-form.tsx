
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
import { RiskAssessmentTool } from './risk-assessment-tool';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const newRiskFormSchema = z.object({
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters long.',
  }),
  mitigation: z.string().min(10, {
    message: 'Initial mitigation must be at least 10 characters long.',
  }),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
  likelihood: z.custom<RiskLikelihood>((val) => typeof val === 'string', {
    message: 'Likelihood is required.',
  }),
  severity: z.custom<RiskSeverity>((val) => typeof val === 'string', {
    message: 'Severity is required.',
  }),
});

type NewRiskFormValues = z.infer<typeof newRiskFormSchema>;

interface NewRiskFormProps {
  onSubmit: (data: Omit<NewRiskFormValues, 'riskScore'>) => void;
}

const hazardAreas = ['Flight Operations', 'Maintenance', 'Ground Operations', 'Administration'];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];


export function NewRiskForm({ onSubmit }: NewRiskFormProps) {
  const form = useForm<NewRiskFormValues>({
    resolver: zodResolver(newRiskFormSchema),
  });

  const handleAssessmentChange = (
    likelihood: RiskLikelihood | null,
    severity: RiskSeverity | null
  ) => {
    if (likelihood) form.setValue('likelihood', likelihood);
    if (severity) form.setValue('severity', severity);
  };

  function handleFormSubmit(data: NewRiskFormValues) {
    onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Risk Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the identified risk..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mitigation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Mitigation Strategy</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the initial plan to mitigate this risk..."
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
            <FormLabel>Initial Risk Assessment</FormLabel>
            <p className="text-sm text-muted-foreground mb-4">
              Assess the risk level before any mitigation is applied.
            </p>
            <RiskAssessmentTool
              onAssessmentChange={handleAssessmentChange}
              showResultCard={false}
            />
            {form.formState.errors.likelihood && (
              <FormMessage>{form.formState.errors.likelihood.message}</FormMessage>
            )}
            {form.formState.errors.severity && (
              <FormMessage>{form.formState.errors.severity.message}</FormMessage>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit">Add to Risk Register</Button>
        </div>
      </form>
    </Form>
  );
}
