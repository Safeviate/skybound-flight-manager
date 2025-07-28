
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
import type { Company } from '@/lib/types';
import { Paintbrush } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';

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
  logo: z.any().optional(),
  enableAdvancedAnalytics: z.boolean().default(false),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface EditCompanyFormProps {
    company: Company;
    onSubmit: (updatedData: Partial<Company>, logoFile?: File) => void;
}

export function EditCompanyForm({ company, onSubmit }: EditCompanyFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
  });

  useEffect(() => {
    form.reset({
        name: company.name,
        trademark: company.trademark || '',
        primaryColor: company.theme?.primary,
        backgroundColor: company.theme?.background,
        accentColor: company.theme?.accent,
        enableAdvancedAnalytics: company.enabledFeatures?.includes('AdvancedAnalytics') || false,
    })
  }, [company, form]);

  function handleFormSubmit(data: CompanyFormValues) {
    const updatedCompanyData: Partial<Company> = {
        name: data.name,
        trademark: data.trademark,
        theme: {
            primary: data.primaryColor,
            background: data.backgroundColor,
            accent: data.accentColor,
        },
        enabledFeatures: data.enableAdvancedAnalytics ? ['AdvancedAnalytics'] : [],
    };
    const logoFile = data.logo?.[0];
    
    onSubmit(updatedCompanyData, logoFile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-2">
            <h4 className="font-semibold">Company Details</h4>
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
        </div>

        <div className="space-y-4">
            <FormLabel className="flex items-center gap-2">
                <Paintbrush className="h-4 w-4" />
                Theme Colors
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
             <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Company Logo</FormLabel>
                    <FormControl>
                        <Input type="file" accept="image/*" {...form.register('logo')} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
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
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
