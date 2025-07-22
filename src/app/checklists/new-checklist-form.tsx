
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
import { PlusCircle, Trash2 } from 'lucide-react';
import type { Checklist } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const checklistFormSchema = z.object({
  title: z.string().min(3, {
    message: 'Title must be at least 3 characters.',
  }),
  category: z.enum(['Pre-Flight', 'Post-Flight', 'Post-Maintenance'], {
    required_error: 'Please select a category.',
  }),
  items: z.array(z.object({ text: z.string().min(1, { message: "Item text cannot be empty."}) })).min(1, {
      message: "You must add at least one checklist item."
  }),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface NewChecklistFormProps {
    onSubmit: (data: Omit<Checklist, 'id' | 'items'> & { items: { text: string, completed: boolean }[] }) => void;
}

export function NewChecklistForm({ onSubmit }: NewChecklistFormProps) {
  const { toast } = useToast();
  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: {
      title: '',
      items: [{ text: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const handleFormSubmit = (data: ChecklistFormValues) => {
    const newChecklist = {
      ...data,
      items: data.items.map(item => ({ text: item.text, completed: false })),
    };
    onSubmit(newChecklist);
    toast({
      title: 'Checklist Created',
      description: `The "${data.title}" checklist has been added.`,
    });
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
                <Input placeholder="e.g., Cessna 172 Post-Flight" {...field} />
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
             {form.formState.errors.items && !form.formState.errors.items.root && (
                 <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.items.message}
                </p>
             )}
             {Array.isArray(form.formState.errors.items) && form.formState.errors.items.map((error, index) => (
                error?.text && (
                    <p key={index} className="text-sm font-medium text-destructive mt-2">
                        Item #{index + 1}: {error.text.message}
                    </p>
                )
            ))}
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
          <Button type="submit">Create Checklist</Button>
        </div>
      </form>
    </Form>
  );
}
