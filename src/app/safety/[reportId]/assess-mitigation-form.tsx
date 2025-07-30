
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
import { RiskAssessmentTool } from './risk-assessment-tool';
import { Card, CardContent } from '@/components/ui/card';

const assessMitigationFormSchema = z.object({
  mitigationControls: z.string().min(10, {
    message: 'Mitigation controls must be at least 10 characters long.',
  }),
  residualLikelihood: z.custom<RiskLikelihood>(val => typeof val === 'string', 'Likelihood is required.'),
  residualSeverity: z.custom<RiskSeverity>(val => typeof val === 'string', 'Severity is required.'),
});

type AssessMitigationFormValues = z.infer<typeof assessMitigationFormSchema>;

interface AssessMitigationFormProps {
    risk: AssociatedRisk;
    onAssessRisk: (riskId: string, updatedValues: Pick<AssociatedRisk, 'mitigationControls' | 'residualLikelihood' | 'residualSeverity'>) => void;
}

export function AssessMitigationForm({ risk, onAssessRisk }: AssessMitigationFormProps) {
  const form = useForm<AssessMitigationFormValues>({
    resolver: zodResolver(assessMitigationFormSchema),
    defaultValues: {
        mitigationControls: risk.mitigationControls || '',
        residualLikelihood: risk.residualLikelihood,
        residualSeverity: risk.residualSeverity,
    }
  });

  const handleAssessmentChange = (likelihood: RiskLikelihood | null, severity: RiskSeverity | null) => {
    if (likelihood) form.setValue('residualLikelihood', likelihood);
    if (severity) form.setValue('residualSeverity', severity);
  };

  function onSubmit(data: AssessMitigationFormValues) {
    onAssessRisk(risk.id, data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="mitigationControls"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mitigation Controls Implemented</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the controls and corrective actions that were implemented to mitigate this risk..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Card>
            <CardContent className="pt-6">
                 <FormLabel>Residual Risk Assessment</FormLabel>
                 <p className="text-sm text-muted-foreground mb-4">Assess the risk level *after* the implementation of the controls.</p>
                 <RiskAssessmentTool
                 />
                 {form.formState.errors.residualLikelihood && <FormMessage>{form.formState.errors.residualLikelihood.message}</FormMessage>}
                 {form.formState.errors.residualSeverity && <FormMessage>{form.formState.errors.residualSeverity.message}</FormMessage>}
            </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit">Save Mitigation Assessment</Button>
        </div>
      </form>
    </Form>
  );
}
