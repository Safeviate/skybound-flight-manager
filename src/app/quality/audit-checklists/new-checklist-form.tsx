
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

const AUDIT_AREAS: AuditArea[] = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

const checklistItemSchema = z.object({
    text: z.string().min(1, { message: "Item text cannot be empty."}),
});

const checklistFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Title must be at least 3 characters.',
  }),
  area: z.enum(AUDIT_AREAS, {
    required_error: 'Please select an audit area.',
  }),
  items: z.array(checklistItemSchema).min(1, {
      message: "You must add at least one checklist item."
  }),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface NewChecklistFormProps {
    onSubmit: (data: Omit<AuditChecklist, 'id' | 'companyId'>) => void;
    existingTemplate?: AuditChecklist;
}

export function NewChecklistForm({ onSubmit, existingTemplate }: NewChecklistFormProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      title: '',
      items: [{ text: '' }],
    },
  });
  
  useEffect(() => {
    if (existingTemplate) {
        form.reset({
            title: existingTemplate.title,
            area: existingTemplate.area,
            items: existingTemplate.items.map(item => ({ text: item.text })),
        });
    } else {
        form.reset({
            title: '',
            area: undefined,
            items: [{ text: '' }],
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
      items: data.items.map(item => ({ ...item, id: `item-${Date.now()}-${Math.random()}`, finding: null })),
    };
    onSubmit(newChecklist);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Checklist Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Annual Hangar Safety Inspection" {...field} />
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
                    {AUDIT_AREAS.map(area => (
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
            <ScrollArea className="h-60 mt-2 pr-4 border rounded-md p-2">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                        control={form.control}
                        name={`items.${index}.text`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormControl>
                                <Input placeholder={`Item #${index + 1}`} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    ))}
                </div>
             </ScrollArea>
             {form.formState.errors.items?.root && (
                 <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.items.root.message}
                </p>
             )}
        </div>
         <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append({ text: '' })}
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
