
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

const reportFormSchema = z.object({
  reportType: z.enum(['Flight Operations Report', 'Ground Operations Report', 'Occupational Report', 'General Report'], {
    required_error: 'Please select a report type.',
  }),
  aircraftInvolved: z.string().optional(),
  details: z.string().min(20, {
    message: 'Details must be at least 20 characters long.',
  }),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

export function NewSafetyReportForm() {
  const { toast } = useToast();
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
  });

  function onSubmit(data: ReportFormValues) {
    console.log(data);
    toast({
      title: 'Report Filed',
      description: 'Your safety report has been submitted for review.',
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
