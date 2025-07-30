
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
import { ScrollArea } from '@/components/ui/scroll-area';

const likelihoodValues: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];
const severityValues: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];

const assessMitigationFormSchema = z.object({
  mitigationControls: z.string().min(10, {
    message: 'Mitigation controls must be at least 10 characters long.',
  }),
  residualLikelihood: z.enum(likelihoodValues, { required_error: 'Likelihood is required.'}),
  residualSeverity: z.enum(severityValues, { required_error: 'Severity is required.'}),
});

type AssessMitigationFormValues = z.infer<typeof assessMitigationFormSchema>;

interface AssessMitigationFormProps {
    risk: AssociatedRisk;
    onAssessRisk: (riskId: string, updatedValues: Pick<AssociatedRisk, 'mitigationControls' | 'residualLikelihood' | 'residualSeverity'>) => void;
}

const severityMap: Record<RiskSeverity, string> = { 'Catastrophic': 'A', 'Hazardous': 'B', 'Major': 'C', 'Minor': 'D', 'Negligible': 'E' };
const likelihoodMap: Record<RiskLikelihood, number> = { 'Frequent': 5, 'Occasional': 4, 'Remote': 3, 'Improbable': 2, 'Extremely Improbable': 1 };


export function AssessMitigationForm({ risk, onAssessRisk }: AssessMitigationFormProps) {
  const form = useForm<AssessMitigationFormValues>({
    resolver: zodResolver(assessMitigationFormSchema),
    defaultValues: {
        mitigationControls: risk.mitigationControls || '',
        residualLikelihood: risk.residualLikelihood,
        residualSeverity: risk.residualSeverity,
    }
  });

  const watchedLikelihood = form.watch('residualLikelihood');
  const watchedSeverity = form.watch('residualSeverity');

  const handleAssessmentChange = (likelihood: RiskLikelihood, severity: RiskSeverity) => {
    form.setValue('residualLikelihood', likelihood, { shouldValidate: true });
    form.setValue('residualSeverity', severity, { shouldValidate: true });
  };

  function onSubmit(data: AssessMitigationFormValues) {
    onAssessRisk(risk.id, data);
  }
  
  const getSelectedCode = () => {
    if (watchedLikelihood && watchedSeverity) {
        return `${likelihoodMap[watchedLikelihood]}${severityMap[watchedSeverity]}`;
    }
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] pr-6">
            <div className="space-y-4">
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
                            onCellClick={handleAssessmentChange}
                            selectedCode={getSelectedCode()}
                        />
                        {form.formState.errors.residualLikelihood && <FormMessage>{form.formState.errors.residualLikelihood.message}</FormMessage>}
                        {form.formState.errors.residualSeverity && <FormMessage>{form.formState.errors.residualSeverity.message}</FormMessage>}
                    </CardContent>
                </Card>
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Mitigation Assessment</Button>
        </div>
      </form>
    </Form>
  );
}
