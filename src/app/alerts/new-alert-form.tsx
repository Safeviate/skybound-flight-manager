
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


const alertFormSchema = z.object({
  type: z.enum(['Red Tag', 'Yellow Tag'], {
    required_error: 'Please select an alert type.',
  }),
  title: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  department: z.string().optional(),
  background: z.string().min(10, { message: 'Background must be at least 10 characters.' }),
  purpose: z.string().min(10, { message: 'Purpose must be at least 10 characters.' }),
  instruction: z.string().min(10, { message: 'Instruction must be at least 10 characters.' }),
  reviewDate: z.date().optional(),
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
      department: '',
      background: '',
      purpose: '',
      instruction: '',
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
        department: existingAlert.department,
        background: existingAlert.background,
        purpose: existingAlert.purpose,
        instruction: existingAlert.instruction,
        reviewDate: existingAlert.reviewDate ? parseISO(existingAlert.reviewDate) : undefined,
      });
    } else {
        form.reset({
            type: undefined,
            title: '',
            department: '',
            background: '',
            purpose: '',
            instruction: '',
            reviewDate: undefined,
        });
    }
  }, [existingAlert, form]);

  function handleFormSubmit(data: AlertFormValues) {
    const dataToSubmit = {
        ...data,
        reviewDate: data.reviewDate ? format(data.reviewDate, 'yyyy-MM-dd') : undefined,
    }
    onSubmit(dataToSubmit as Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>);
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
          name="background"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide background information..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl>
                <Textarea placeholder="State the purpose of this alert..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="instruction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instruction / Action Required</FormLabel>
              <FormControl>
                <Textarea placeholder="Detail the required actions..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reviewDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Review Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
