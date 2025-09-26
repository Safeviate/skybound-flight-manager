
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
import type { Alert, Department, CompanyDepartment } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';


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
  department: z.string().optional(),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

interface NewAlertFormProps {
  onSubmit: (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => void;
  existingAlert?: Alert | null;
}

export function NewAlertForm({ onSubmit, existingAlert }: NewAlertFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      title: '',
      description: '',
      department: '',
    },
  });

  useEffect(() => {
    const fetchDepartments = async () => {
        if (!company) return;
        try {
            const deptsQuery = query(collection(db, `companies/${company.id}/departments`));
            const deptsSnapshot = await getDocs(deptsQuery);
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch departments.' });
        }
    };
    fetchDepartments();
  }, [company, toast]);

  useEffect(() => {
    if (existingAlert) {
      form.reset({
        type: existingAlert.type as 'Red Tag' | 'Yellow Tag',
        title: existingAlert.title,
        description: existingAlert.description,
        department: existingAlert.department,
      });
    } else {
        form.reset({
            type: undefined,
            title: '',
            description: '',
            department: '',
        });
    }
  }, [existingAlert, form]);

  function handleFormSubmit(data: AlertFormValues) {
    onSubmit(data);
    form.reset();
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
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target Department (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department to target" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
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
          <Button type="submit">{existingAlert ? 'Save Changes' : 'Issue Notification'}</Button>
        </div>
      </form>
    </Form>
  );
}
