

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
import type { CorrectiveActionPlan, User, Role } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';


const capFormSchema = z.object({
  rootCause: z.string().min(10, {
    message: 'Root cause must be at least 10 characters long.',
  }),
  correctiveAction: z.string().min(10, {
    message: 'Corrective action must be at least 10 characters long.',
  }),
  preventativeAction: z.string().min(10, {
    message: 'Preventative action must be at least 10 characters long.',
  }),
  responsiblePerson: z.string({
    required_error: 'Please select a responsible person.',
  }),
  completionDate: z.date({
    required_error: 'A completion date is required.',
  }),
});

type CapFormValues = z.infer<typeof capFormSchema>;

interface CorrectiveActionPlanFormProps {
    onSubmit: (data: CorrectiveActionPlan) => void;
    suggestedCap?: GenerateQualityCapOutput | null;
}

export function CorrectiveActionPlanForm({ onSubmit, suggestedCap }: CorrectiveActionPlanFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [personnel, setPersonnel] = useState<User[]>([]);

  const form = useForm<CapFormValues>({
    resolver: zodResolver(capFormSchema),
    defaultValues: {
      completionDate: new Date(),
    },
  });

  useEffect(() => {
    if (suggestedCap) {
      form.setValue('rootCause', suggestedCap.rootCause);
      form.setValue('correctiveAction', suggestedCap.correctiveAction);
      form.setValue('preventativeAction', suggestedCap.preventativeAction);
    }
  }, [suggestedCap, form]);

  useEffect(() => {
    const fetchPersonnel = async () => {
        if (!company) return;
        const q = query(collection(db, `companies/${company.id}/users`));
        const snapshot = await getDocs(q);
        setPersonnel(snapshot.docs.map(doc => doc.data() as User));
    }
    fetchPersonnel();
  }, [company]);
  
  const uniquePersonnel = personnel.filter((person, index, self) =>
    index === self.findIndex((p) => (
      p.name === person.name
    ))
  );


  function handleFormSubmit(data: CapFormValues) {
    const newCap: CorrectiveActionPlan = {
      ...data,
      completionDate: format(data.completionDate, 'yyyy-MM-dd'),
      status: 'Open',
    };
    onSubmit(newCap);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rootCause"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Root Cause</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the identified root cause of the finding..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correctiveAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Corrective Action</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detail the specific action to be taken to correct the issue..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preventativeAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preventative Action</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detail the action to be taken to prevent recurrence..."
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
            name="responsiblePerson"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Responsible Person</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                    {uniquePersonnel.map((person) => (
                        <SelectItem key={person.id} value={person.name}>
                        {person.name} ({person.role})
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
                name="completionDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Target Completion Date</FormLabel>
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
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Corrective Action Plan</Button>
        </div>
      </form>
    </Form>
  );
}
