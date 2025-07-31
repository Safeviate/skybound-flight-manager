
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
import type { Checklist, ChecklistItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';

const checklistItemSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(1, { message: "Item text cannot be empty."}),
    type: z.enum(['Checkbox', 'Confirm postflight hobbs']),
});

const checklistFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Title must be at least 3 characters.',
  }),
  category: z.enum(['Pre-Flight', 'Post-Flight', 'Post-Maintenance'], {
      required_error: 'Please select a category.'
  }),
  items: z.array(checklistItemSchema).min(1, {
      message: "You must add at least one checklist item."
  }),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface ChecklistTemplateFormProps {
    onSubmit: (data: Omit<Checklist, 'id' | 'companyId'>) => void;
    existingTemplate?: Checklist;
}

export function ChecklistTemplateForm({ onSubmit, existingTemplate }: ChecklistTemplateFormProps) {
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      title: '',
      items: [{ text: '', type: 'Checkbox' }],
    },
  });
  
  useEffect(() => {
    if (existingTemplate) {
        form.reset({
            title: existingTemplate.title,
            category: existingTemplate.category,
            items: existingTemplate.items.map(item => ({ id: item.id, text: item.text, type: item.type as 'Checkbox' | 'Confirm postflight hobbs' })),
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
      items: data.items.map(item => ({ ...item, id: item.id || `item-${Date.now()}-${Math.random()}`, completed: false, value: '' })),
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
                <Input placeholder="e.g., Cessna 172 Pre-Flight" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
        control={form.control}
        name="category"
        render={({ field }) => (
            <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                </FormControl>
                <SelectContent>
                <SelectItem value="Pre-Flight">Pre-Flight</SelectItem>
                <SelectItem value="Post-Flight">Post-Flight</SelectItem>
                <SelectItem value="Post-Maintenance">Post-Maintenance</SelectItem>
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
                                    <FormLabel className="sr-only">Item Text</FormLabel>
                                    <FormControl>
                                        <Input placeholder={`Item #${index + 1} text`} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.type`}
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel className="sr-only">Item Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select item type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Checkbox">Standard Checkbox</SelectItem>
                                            <SelectItem value="Confirm postflight hobbs">Hobbs Meter Reader (Post-Flight)</SelectItem>
                                        </SelectContent>
                                    </Select>
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
            onClick={() => append({ text: '', type: 'Checkbox' })}
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
