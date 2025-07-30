
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
import type { Risk, RiskLikelihood, RiskSeverity, User } from '@/lib/types';
import { RiskAssessmentTool } from './risk-assessment-tool';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useUser } from '@/context/user-provider';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const hazardAreas = ['Flight Operations', 'Maintenance', 'Ground Operations', 'Cabin Safety', 'Occupational Safety', 'Security', 'Administration & Management'];
const processes = ['Pre-flight', 'Taxiing', 'Takeoff', 'Climb', 'Cruise', 'Descent', 'Approach', 'Landing', 'Post-flight', 'Servicing', 'Other'];

const newRiskFormSchema = z.object({
  hazard: z.string().min(3, { message: 'Hazard is required.'}),
  risk: z.string().min(10, {
    message: 'Description must be at least 10 characters long.',
  }),
  consequences: z.string().min(3, { message: 'At least one consequence is required.'}),
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
  riskOwner: z.string({ required_error: 'Please select a risk owner.' }),
  reviewDate: z.date({ required_error: 'A review date is required.' }),
});

type NewRiskFormValues = z.infer<typeof newRiskFormSchema>;

interface NewRiskFormProps {
  onSubmit: (data: Omit<Risk, 'id' | 'riskScore' | 'dateIdentified' | 'status' | 'companyId'>) => void;
}


export function NewRiskForm({ onSubmit }: NewRiskFormProps) {
  const form = useForm<NewRiskFormValues>({
    resolver: zodResolver(newRiskFormSchema),
    defaultValues: {
      hazard: '',
      risk: '',
      consequences: '',
      mitigation: '',
    },
  });
  
  const { company } = useUser();
  const [personnel, setPersonnel] = useState<User[]>([]);

  useEffect(() => {
    const fetchPersonnel = async () => {
        if (!company) return;
        const q = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
        const snapshot = await getDocs(q);
        setPersonnel(snapshot.docs.map(doc => doc.data() as User));
    };
    fetchPersonnel();
  }, [company]);

  const handleAssessmentChange = (
    likelihood: RiskLikelihood | null,
    severity: RiskSeverity | null
  ) => {
    if (likelihood) form.setValue('likelihood', likelihood);
    if (severity) form.setValue('severity', severity);
  };

  function handleFormSubmit(data: NewRiskFormValues) {
    onSubmit({
        ...data,
        consequences: data.consequences.split(',').map(s => s.trim()),
        reviewDate: format(data.reviewDate, 'yyyy-MM-dd'),
    });
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
                            {personnel.map(owner => <SelectItem key={owner.id} value={owner.name}>{owner.name}</SelectItem>)}
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
