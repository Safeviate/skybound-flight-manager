

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
import type { Alert, Department, CompanyDepartment, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const alertFormSchema = z.object({
  type: z.enum(['Red Tag', 'Yellow Tag', 'General Notice'], {
    required_error: 'Please select an alert type.',
  }),
  title: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  targetType: z.enum(['department', 'user']).optional(),
  department: z.string().optional().nullable(),
  targetUserId: z.string().optional().nullable(),
  reviewerId: z.string().optional(),
  background: z.string().min(10, { message: 'Background must be at least 10 characters.' }),
  purpose: z.string().min(10, { message: 'Purpose must be at least 10 characters.' }),
  instruction: z.string().min(10, { message: 'Instruction must be at least 10 characters.' }),
  reviewDate: z.date().optional(),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

interface NewAlertFormProps {
  onSubmit: (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => void;
  onSaveProgress: (data: Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>) => void;
  existingAlert?: Alert | null;
  allUsers: User[];
}

export function NewAlertForm({ onSubmit, onSaveProgress, existingAlert, allUsers }: NewAlertFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      type: undefined,
      title: '',
      targetType: 'department',
      department: 'all',
      targetUserId: '',
      reviewerId: '',
      background: '',
      purpose: '',
      instruction: '',
      reviewDate: undefined,
    },
  });

  const { watch, setValue } = form;
  const targetType = watch('targetType');

  useEffect(() => {
    const fetchData = async () => {
        if (!company) return;
        try {
            const deptsQuery = query(collection(db, `companies/${company.id}/departments`));
            const deptsSnapshot = await getDocs(deptsQuery);
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch company data.' });
        }
    };
    fetchData();
  }, [company, toast]);
  
  useEffect(() => {
    if (existingAlert) {
      // Robustly set form values when editing an existing alert
      form.reset({
        type: existingAlert.type as 'Red Tag' | 'Yellow Tag' | 'General Notice',
        title: existingAlert.title || '',
        targetType: existingAlert.targetUserId ? 'user' : 'department',
        department: existingAlert.targetUserId ? null : existingAlert.department || 'all',
        targetUserId: existingAlert.targetUserId || null,
        reviewerId: existingAlert.reviewerId || '',
        background: existingAlert.background || '',
        purpose: existingAlert.purpose || '',
        instruction: existingAlert.instruction || '',
        reviewDate: existingAlert.reviewDate ? parseISO(existingAlert.reviewDate) : undefined,
      });
    } else {
      // Reset to default values for a new alert
      form.reset({
        type: undefined,
        title: '',
        targetType: 'department',
        department: 'all',
        targetUserId: '',
        reviewerId: '',
        background: '',
        purpose: '',
        instruction: '',
        reviewDate: undefined,
      });
    }
  }, [existingAlert, form]);
  
  function handleFormSubmit(data: AlertFormValues) {
    onSubmit(data as Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>);
    form.reset();
  }
  
  async function handleSaveProgress() {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
       onSaveProgress(data as Omit<Alert, 'id' | 'number' | 'readBy' | 'author' | 'date'>);
    } else {
        toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Please fill out all required fields before saving.'
        });
    }
  }

  const addBulletPoint = (fieldName: keyof AlertFormValues) => {
    const currentValue = form.getValues(fieldName) as string || '';
    const newValue = currentValue ? `${currentValue}\n• ` : '• ';
    form.setValue(fieldName, newValue, { shouldDirty: true });
    // Focus the textarea after updating
    const textarea = document.getElementById(fieldName) as HTMLTextAreaElement;
    if (textarea) {
        textarea.focus();
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
        }, 0);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Red Tag">Red Tag (High Priority)</SelectItem>
                      <SelectItem value="Yellow Tag">Yellow Tag (Standard Priority)</SelectItem>
                      <SelectItem value="General Notice">General Notice</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Send To</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                    if (value === 'department') {
                                        setValue('targetUserId', null);
                                    } else {
                                        setValue('department', null);
                                    }
                                }}
                                value={field.value}
                                className="flex items-center space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="department" /></FormControl>
                                    <FormLabel className="font-normal">Department</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl><RadioGroupItem value="user" /></FormControl>
                                    <FormLabel className="font-normal">Specific User</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )}
            />

            {targetType === 'department' ? (
                <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target Department</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'all'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept) => (<SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            ) : (
                <FormField
                    control={form.control}
                    name="targetUserId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target User</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {allUsers.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

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
                  <div className="flex items-center justify-between">
                    <FormLabel>Background</FormLabel>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => addBulletPoint('background')}>
                        <List className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea id="background" placeholder="Provide background information..." {...field} />
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
                    <div className="flex items-center justify-between">
                        <FormLabel>Purpose</FormLabel>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => addBulletPoint('purpose')}>
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                  <FormControl>
                    <Textarea id="purpose" placeholder="State the purpose of this alert..." {...field} />
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
                    <div className="flex items-center justify-between">
                        <FormLabel>Instruction / Action Required</FormLabel>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => addBulletPoint('instruction')}>
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                  <FormControl>
                    <Textarea id="instruction" placeholder="Detail the required actions..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
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
                <FormField
                    control={form.control}
                    name="reviewerId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Reviewer (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a reviewer" /></SelectTrigger></FormControl>
                            <SelectContent>
                               <SelectItem value="">None</SelectItem>
                               {allUsers.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 gap-2">
            {!existingAlert && (
                <Button type="button" variant="outline" onClick={handleSaveProgress}>Save Progress</Button>
            )}
            <Button type="submit">{existingAlert ? 'Save Changes' : 'Issue Notification'}</Button>
        </div>
      </form>
    </Form>
  );
}
