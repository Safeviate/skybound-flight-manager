
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
import type { Company } from '@/lib/types';
import { Paintbrush } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const companyFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Company name must be at least 2 characters.',
  }),
  trademark: z.string().min(2, {
    message: 'Trademark must be at least 2 characters.',
  }),
  primaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  accentColor: z.string().optional(),
  enableAdvancedAnalytics: z.boolean().default(false),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface NewCompanyFormProps {
  onSubmit: (data: Omit<Company, 'id'>) => void;
}

export function NewCompanyForm({ onSubmit }: NewCompanyFormProps) {

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
  });

  function handleFormSubmit(data: CompanyFormValues) {
    const newCompany: Omit<Company, 'id'> = {
        name: data.name,
        trademark: data.trademark,
        theme: {
            primary: data.primaryColor,
            background: data.backgroundColor,
            accent: data.accentColor,
        },
        enabledFeatures: data.enableAdvancedAnalytics ? ['AdvancedAnalytics'] : [],
    };
    onSubmit(newCompany);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., AeroVentures Flight Academy" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="trademark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trademark / Slogan</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Flying High Since 2002" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-2">
            <FormLabel className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Theme Colors (Optional)
            </FormLabel>
            <div className="grid grid-cols-3 gap-2">
                <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Primary</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="backgroundColor"
                    render={({ field }) => (
                        <FormItem>
                             <FormLabel className="text-xs">Background</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="accentColor"
                    render={({ field }) => (
                        <FormItem>
                             <FormLabel className="text-xs">Accent</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <FormField
            control={form.control}
            name="enableAdvancedAnalytics"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
                <div className="space-y-1 leading-none">
                    <FormLabel>
                        Enable Advanced Analytics Module
                    </FormLabel>
                </div>
                </FormItem>
            )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit">Register Company</Button>
        </div>
      </form>
    </Form>
  );
}
