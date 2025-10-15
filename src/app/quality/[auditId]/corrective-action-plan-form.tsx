
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
import type { CorrectiveAction, CorrectiveActionPlan, User, Role } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


const actionSchema = z.object({
  id: z.string().optional(),
  action: z.string().min(10, 'Action description is required.'),
  isPreventative: z.boolean().default(false),
  responsiblePerson: z.string().min(1, 'Responsible person is required.'),
  completionDate: z.date(),
  status: z.enum(['Open', 'Closed', 'In Progress']).default('Open'),
});

const capFormSchema = z.object({
  rootCause: z.string().min(10, {
    message: 'Root cause must be at least 10 characters long.',
  }),
  actions: z.array(actionSchema).min(1, 'At least one corrective action is required.'),
});

type CapFormValues = z.infer<typeof capFormSchema>;

interface CorrectiveActionPlanFormProps {
    onSubmit: (rootCause: string, actions: Omit<CorrectiveAction, 'id'>[]) => void;
    personnel: User[];
    existingPlan?: CorrectiveActionPlan | null;
}

export function CorrectiveActionPlanForm({ onSubmit, personnel, existingPlan }: CorrectiveActionPlanFormProps) {
  const { toast } = useToast();
  
  const form = useForm<CapFormValues>({
    resolver: zodResolver(capFormSchema),
    defaultValues: {
      rootCause: existingPlan?.rootCause || '',
      actions: existingPlan?.actions.map(a => ({...a, completionDate: parseISO(a.completionDate)})) || [{
          action: '',
          isPreventative: false,
          responsiblePerson: '',
          completionDate: new Date(),
          status: 'Open',
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'actions',
  });

  function handleFormSubmit(data: CapFormValues) {
    const actionsToSave = data.actions.map(a => ({
        ...a,
        completionDate: format(a.completionDate, 'yyyy-MM-dd'),
    }));
    onSubmit(data.rootCause, actionsToSave);
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
        
        <div className="space-y-4">
            <FormLabel>Corrective & Preventative Actions</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                    <FormField
                        control={form.control}
                        name={`actions.${index}.action`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">Action</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Describe the action..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name={`actions.${index}.isPreventative`}
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4" />
                                </FormControl>
                                <FormLabel className="font-normal">This is a preventative action</FormLabel>
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name={`actions.${index}.responsiblePerson`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="sr-only">Responsible Person</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {personnel.map((person) => (
                                                <SelectItem key={person.id} value={person.name}>{person.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`actions.${index}.completionDate`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="sr-only">Completion Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                            >
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                    >
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ action: '', isPreventative: false, responsiblePerson: '', completionDate: new Date(), status: 'Open' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Action
            </Button>
             {form.formState.errors.actions && <FormMessage>{form.formState.errors.actions.message}</FormMessage>}
        </div>
       
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Corrective Action Plan</Button>
        </div>
      </form>
    </Form>
  );
}
