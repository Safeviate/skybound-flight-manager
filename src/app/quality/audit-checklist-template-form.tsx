
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
import type { AuditChecklist, AuditChecklistItem, AuditArea } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

const auditChecklistItemSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, { message: "Item text cannot be empty."}),
    regulationReference: z.string().optional(),
});

const auditChecklistFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Title must be at least 3 characters.',
  }),
  area: z.custom<AuditArea>(),
  items: z.array(auditChecklistItemSchema).min(1, {
      message: "You must add at least one checklist item."
  }),
});

type ChecklistFormValues = z.infer<typeof auditChecklistFormSchema>;

interface AuditChecklistTemplateFormProps {
    onSubmit: (data: Omit<AuditChecklist, 'id' | 'companyId'>) => void;
    existingTemplate?: AuditChecklist | null;
}

const auditAreas: AuditArea[] = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

export function AuditChecklistTemplateForm({ onSubmit, existingTemplate }: AuditChecklistTemplateFormProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(auditChecklistFormSchema),
    defaultValues: existingTemplate ? {
        title: existingTemplate.title,
        area: existingTemplate.area,
        items: existingTemplate.items.map(item => ({ id: item.id, text: item.text, regulationReference: item.regulationReference || '' })),
    } : {
      title: '',
      area: 'Management',
      items: [{ text: '', regulationReference: '' }],
    },
  });
  
  useEffect(() => {
    if (existingTemplate) {
        form.reset({
            title: existingTemplate.title,
            area: existingTemplate.area,
            items: existingTemplate.items.map(item => ({ id: item.id, text: item.text, regulationReference: item.regulationReference || '' })),
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
      items: data.items.map(item => ({ ...item, id: item.id || `item-${Date.now()}-${Math.random()}`, finding: null, level: null })),
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
        <FormField
        control={form.control}
        name="area"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Audit Area</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {auditAreas.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <FormMessage />
            </FormItem>
        )}
        />
        <div>
            <FormLabel>Checklist Items</FormLabel>
            <ScrollArea className="h-60 mt-2 pr-4">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-2 p-2 border rounded-md">
                        <div className="flex-1 space-y-2">
                             <FormField
                                control={form.control}
                                name={`items.${index}.text`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Textarea placeholder={`Item #${index + 1} text`} {...field} className="min-h-[40px]"/>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.regulationReference`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormControl>
                                        <Input placeholder="Regulation Reference (e.g., SACAA CAR 61.01.1)" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                       
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            className="shrink-0 mt-1"
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    ))}
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
            onClick={() => append({ text: '', regulationReference: '' })}
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
