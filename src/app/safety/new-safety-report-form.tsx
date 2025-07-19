
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { aircraftData } from '@/lib/mock-data';
import type { SafetyReport, SafetyReportType } from '@/lib/types';

const flightOpsSubCategories = [
    'Airspace Violation',
    'Runway Incursion/Excursion',
    'Loss of Separation',
    'Unstable Approach',
    'Go-Around',
    'Bird Strike',
    'Weather Related Incident',
    'Aircraft System Malfunction',
    'Passenger Related Incident',
    'Air Traffic Control (ATC) Issue',
    'Other',
];

const lossOfSeparationTypes = [
    'Close Proximity',
    'Resolution advisory',
    'TA traffic Alert',
];

const reportFormSchema = z.object({
  reportType: z.enum(['Flight Operations Report', 'Ground Operations Report', 'Occupational Report', 'General Report'], {
    required_error: 'Please select a report type.',
  }),
  subCategory: z.string().optional(),
  lossOfSeparationType: z.string().optional(),
  aircraftInvolved: z.string().optional(),
  details: z.string().min(20, {
    message: 'Details must be at least 20 characters long.',
  }),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

interface NewSafetyReportFormProps {
    safetyReports: SafetyReport[];
    onSubmit: (newReport: Omit<SafetyReport, 'id' | 'submittedBy' | 'date' | 'status'>) => void;
}

const getReportTypeAbbreviation = (type: SafetyReportType) => {
    switch (type) {
        case 'Flight Operations Report': return 'FOR';
        case 'Ground Operations Report': return 'GOR';
        case 'Occupational Report': return 'OR';
        case 'General Report': return 'GR';
        default: return 'REP';
    }
}

export function NewSafetyReportForm({ safetyReports, onSubmit }: NewSafetyReportFormProps) {
  const { toast } = useToast();
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
  });

  const reportType = form.watch('reportType');
  const subCategory = form.watch('subCategory');

  function handleFormSubmit(data: ReportFormValues) {
    const reportTypeAbbr = getReportTypeAbbreviation(data.reportType);
    const reportsOfType = safetyReports.filter(r => r.reportNumber.startsWith(reportTypeAbbr));
    const nextId = reportsOfType.length + 1;
    const reportNumber = `${reportTypeAbbr}-${String(nextId).padStart(3, '0')}`;

    const newReport = {
        ...data,
        reportNumber,
    };
    
    onSubmit(newReport);

    toast({
      title: 'Report Filed',
      description: `Your safety report (${reportNumber}) has been submitted for review.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="reportType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Report Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a report type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Flight Operations Report">Flight Operations Report</SelectItem>
                  <SelectItem value="Ground Operations Report">Ground Operations Report</SelectItem>
                  <SelectItem value="Occupational Report">Occupational Report</SelectItem>
                  <SelectItem value="General Report">General Report</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {reportType === 'Flight Operations Report' && (
            <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Flight Operations Sub-Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a sub-category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {flightOpsSubCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        {subCategory === 'Loss of Separation' && (
            <FormField
                control={form.control}
                name="lossOfSeparationType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Type of Separation Loss</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select the type of separation loss" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {lossOfSeparationTypes.map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="aircraftInvolved"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft Involved (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an aircraft if applicable" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {aircraftData.map((ac) => (
                    <SelectItem key={ac.id} value={ac.tailNumber}>
                      {ac.model} ({ac.tailNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide a detailed description of the event, including date, time, location, and persons involved..."
                  className="min-h-[150px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit">Submit Report</Button>
        </div>
      </form>
    </Form>
  );
}
