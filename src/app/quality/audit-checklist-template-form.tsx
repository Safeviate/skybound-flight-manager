

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { AuditChecklist, AuditChecklistItem, AuditArea, ChecklistItemType } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const auditChecklistItemSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, { message: "Item text cannot be empty."}),
    regulationReference: z.string().optional(),
    type: z.custom<ChecklistItemType>(),
});

const auditChecklistFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Title must be at least 3 characters.',
  }),
  items: z.array(auditChecklistItemSchema).min(1, {
      message: "You must add at least one checklist item."
  }),
});

type ChecklistFormValues = z.infer<typeof auditChecklistFormSchema>;

interface AuditChecklistTemplateFormProps {
    onSubmit: (data: Omit<AuditChecklist, 'id' | 'companyId' | 'area'>) => void;
    existingTemplate?: AuditChecklist | null;
}

const checklistItemTypes: ChecklistItemType[] = ['Checkbox', 'Textbox', 'StandardCamera', 'AICamera-Registration', 'AICamera-Hobbs', 'Header'];


export function AuditChecklistTemplateForm({ onSubmit, existingTemplate }: AuditChecklistTemplateFormProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(auditChecklistFormSchema),
    defaultValues: existingTemplate ? {
        title: existingTemplate.title,
        items: existingTemplate.items.map(item => ({ id: item.id, text: item.text, regulationReference: item.regulationReference || '', type: item.type || 'Checkbox' })),
    } : {
      title: '',
      items: [{ text: '', regulationReference: '', type: 'Checkbox' }],
    },
  });
  
  useEffect(() => {
    if (existingTemplate) {
        form.reset({
            title: existingTemplate.title,
            items: existingTemplate.items.map(item => ({ id: item.id, text: item.text, regulationReference: item.regulationReference || '', type: item.type || 'Checkbox' })),
        });
    }
  }, [existingTemplate, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const handleFormSubmit = (data: ChecklistFormValues) => {
    const newChecklist = {
      ...data,
      items: data.items.map(item => ({ ...item, id: item.id || `item-${Date.now()}-${Math.random()}`, finding: null, level: null, evidence: '' })),
    };
    onSubmit(newChecklist);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Checklist Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Quarterly Flight Operations Inspection" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
            <FormLabel>Checklist Items</FormLabel>
            <ScrollArea className="h-60 mt-2 pr-4">
                <div className="space-y-3">
                    {fields.map((field, index) => {
                       const itemType = form.watch(`items.${index}.type`);
                       const isHeader = itemType === 'Header';
                       return (
                            <div key={field.id} className={cn("flex items-start gap-2 p-2 border rounded-md", isHeader && "bg-muted/50")}>
                                <span className="font-semibold text-sm pt-2">{index + 1}.</span>
                                <div className="flex-1 space-y-2">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.text`}
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormControl>
                                                <Textarea placeholder={isHeader ? "Enter section header title..." : `Item text (include regulation in text if applicable)`} {...field} className={cn("min-h-[40px]", isHeader && "font-bold text-base bg-transparent border-0 shadow-none focus-visible:ring-0")} />
                                            </FormControl>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.type`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select item type" /></SelectTrigger></FormControl>
                                                        <SelectContent>{checklistItemTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {!isHeader && (
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.regulationReference`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl><Input placeholder="Regulation (e.g., CAR 91.04.8)" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 mt-1">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                       )
                    })}
                </div>
             </ScrollArea>
             {form.formState.errors.items && form.formState.errors.items.root && (
                 <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.items.message}
                </p>
             )}
        </div>
         <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append({ text: '', regulationReference: '', type: 'Checkbox' })}
            >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Item
        </Button>
        <div className="flex justify-end pt-4">
          <Button type="submit">{existingTemplate ? 'Save Changes' : 'Create Template'}</Button>
        </div>
      </form>
    </Form>
  );
}
