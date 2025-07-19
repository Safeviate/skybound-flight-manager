

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
import { userData } from '@/lib/mock-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { getRiskScore } from '@/lib/utils.tsx';
import { Separator } from '@/components/ui/separator';

const editRiskFormSchema = z.object({
  hazard: z.string().min(3, { message: 'Hazard is required.'}),
  risk: z.string().min(10, {
    message: 'Description must be at least 10 characters long.',
  }),
  consequences: z.string().min(3, { message: 'At least one consequence is required.'}),
  existingMitigation: z.string().optional(),
  proposedMitigation: z.string().optional(),
  mitigation: z.string().min(10, {
    message: 'Mitigation must be at least 10 characters long.',
  }),
  hazardArea: z.string({ required_error: 'Please select a hazard area.'}),
  process: z.string({ required_error: 'Please select a process.'}),
  likelihood: z.custom<RiskLikelihood>((val) => typeof val === 'string', {
    message: 'Likelihood is required.',
  }),
  severity: z.custom<RiskSeverity>((val) => typeof val === 'string', {
    message: 'Severity is required.',
  }),
  residualLikelihood: z.custom<RiskLikelihood>().optional(),
  residualSeverity: z.custom<RiskSeverity>().optional(),
  riskOwner: z.string({ required_error: 'Please select a risk owner.' }),
  reviewDate: z.date({ required_error: 'A review date is required.' }),
});

type EditRiskFormValues = z.infer<typeof editRiskFormSchema>;

interface EditRiskFormProps {
  risk: Risk;
  onSubmit: (data: Risk) => void;
}

const hazardAreas = ['Flight Operations', 'Maintenance', 'Ground Operations', 'Administration'];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];


export function EditRiskForm({ risk, onSubmit }: EditRiskFormProps) {
  const form = useForm<EditRiskFormValues>({
    resolver: zodResolver(editRiskFormSchema),
    defaultValues: {
      ...risk,
      consequences: risk.consequences.join(', '),
      reviewDate: risk.reviewDate ? parseISO(risk.reviewDate) : new Date(),
    },
  });

  const availableOwners = userData.filter(u => u.role !== 'Student');

  const handleInitialAssessmentChange = (
    likelihood: RiskLikelihood | null,
    severity: RiskSeverity | null
  ) => {
    if (likelihood) form.setValue('likelihood', likelihood);
    if (severity) form.setValue('severity', severity);
  };
  
  const handleResidualAssessmentChange = (
    likelihood: RiskLikelihood | null,
    severity: RiskSeverity | null
  ) => {
    if (likelihood) form.setValue('residualLikelihood', likelihood);
    if (severity) form.setValue('residualSeverity', severity);
  };

  function handleFormSubmit(data: EditRiskFormValues) {
    const riskScore = getRiskScore(data.likelihood, data.severity);
    let residualRiskScore: number | undefined = undefined;
    if (data.residualLikelihood && data.residualSeverity) {
        residualRiskScore = getRiskScore(data.residualLikelihood, data.residualSeverity);
    }
    
    onSubmit({
        ...risk,
        ...data,
        consequences: data.consequences.split(',').map(s => s.trim()),
        reviewDate: format(data.reviewDate, 'yyyy-MM-dd'),
        riskScore,
        residualRiskScore,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
        <FormField
          control={form.control}
          name="hazard"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hazard</FormLabel>
              <FormControl>
                <Input placeholder="Describe the hazard" {...field} />
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
          name="consequences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consequences</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="List potential consequences, separated by commas"
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
             <FormField
                control={form.control}
                name="riskOwner"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Risk Owner</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an owner" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableOwners.map(owner => <SelectItem key={owner.id} value={owner.name}>{owner.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="reviewDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                        <FormLabel>Next Review Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                    date < new Date()
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
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
              onAssessmentChange={handleInitialAssessmentChange}
              showResultCard={false}
              initialLikelihood={form.getValues('likelihood')}
              initialSeverity={form.getValues('severity')}
            />
            {form.formState.errors.likelihood && (
              <FormMessage>{form.formState.errors.likelihood.message}</FormMessage>
            )}
            {form.formState.errors.severity && (
              <FormMessage>{form.formState.errors.severity.message}</FormMessage>
            )}
          </CardContent>
        </Card>
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="existingMitigation"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Existing Mitigation</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Describe any existing mitigation strategies..."
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="proposedMitigation"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Proposed Mitigation</FormLabel>
                <FormControl>
                    <Textarea
                    placeholder="Describe any new or proposed mitigation..."
                    {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
         <FormField
          control={form.control}
          name="mitigation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Mitigation Strategy</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the final, implemented plan to mitigate this risk..."
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
            <p className="text-sm text-muted-foreground mb-4">
              Assess the risk level *after* all mitigations are applied.
            </p>
            <RiskAssessmentTool
              onAssessmentChange={handleResidualAssessmentChange}
              showResultCard={false}
              initialLikelihood={form.getValues('residualLikelihood')}
              initialSeverity={form.getValues('residualSeverity')}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
