
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter } from '@/components/ui/dialog';

const formSchema = z.object({
  maint1: z.boolean().refine(val => val === true, { message: "This must be checked." }),
  maint2: z.boolean().refine(val => val === true, { message: "This must be checked." }),
  maint3: z.boolean().refine(val => val === true, { message: "This must be checked." }),
  maint4: z.string().min(1, { message: "A summary is required." }),
  maint5: z.boolean().refine(val => val === true, { message: "This must be checked." }),
});

type FormValues = z.infer<typeof formSchema>;

interface PostMaintenanceChecklistFormProps {
  onSubmit: (data: FormValues) => void;
}

export function PostMaintenanceChecklistForm({ onSubmit }: PostMaintenanceChecklistFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maint1: false,
      maint2: false,
      maint3: false,
      maint4: '',
      maint5: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ScrollArea className="h-[60vh] p-4 border rounded-md -mx-6 -my-2">
            <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="maint1"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>All tools and equipment removed from aircraft</FormLabel>
                            <FormMessage />
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maint2"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>All panels and cowlings secured</FormLabel>
                             <FormMessage />
                        </div>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="maint3"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Fluid levels (oil, hydraulic fluid) checked</FormLabel>
                             <FormMessage />
                        </div>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="maint4"
                    render={({ field }) => (
                        <FormItem className="rounded-md border p-4">
                            <FormLabel>Brief summary of work completed</FormLabel>
                            <FormControl><Textarea placeholder="e.g., Completed 100-hour inspection..." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="maint5"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel>Certificate of Release to Service signed</FormLabel>
                             <FormMessage />
                        </div>
                        </FormItem>
                    )}
                />
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button type="submit">Submit Checklist</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
