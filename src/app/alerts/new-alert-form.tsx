
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
import type { Alert } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { format } from 'date-fns';

const alertFormSchema = z.object({
  type: z.enum(['Red Tag', 'Yellow Tag'], {
    required_error: 'Please select an alert type.',
  }),
  title: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

interface NewAlertFormProps {
  onSubmit: (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => void;
}

export function NewAlertForm({ onSubmit }: NewAlertFormProps) {
  const { toast } = useToast();
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
  });

  function handleFormSubmit(data: AlertFormValues) {
    onSubmit(data);
    toast({
      title: 'Alert Created',
      description: `The "${data.title}" alert has been issued.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Red Tag">Red Tag (High Priority)</SelectItem>
                  <SelectItem value="Yellow Tag">Yellow Tag (Standard Priority)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Runway 31 Closed" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide details about the alert..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit">Issue Notification</Button>
        </div>
      </form>
    </Form>
  );
}
