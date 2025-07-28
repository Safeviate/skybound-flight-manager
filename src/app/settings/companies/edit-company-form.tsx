
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Company, Feature } from '@/lib/types';
import { Paintbrush } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const features: { id: Feature, label: string, description: string }[] = [
    { id: 'Safety', label: 'Safety Management', description: 'Enables the Safety Management System (SMS) module for incident reporting and risk management.' },
    { id: 'Quality', label: 'Quality Assurance', description: 'Enables the Quality Management System (QMS) module for audits and compliance.' },
    { id: 'Bookings', label: 'Bookings & Scheduling', description: 'Enables the aircraft booking and scheduling system.' },
    { id: 'Aircraft', label: 'Aircraft Management', description: 'Enables fleet management, document tracking, and checklists.' },
    { id: 'Students', label: 'Student Management', description: 'Enables tracking of student training progress, logs, and endorsements.' },
    { id: 'Personnel', label: 'Personnel Management', description: 'Enables management of staff and non-student personnel records.' },
    { id: 'AdvancedAnalytics', label: 'Advanced Analytics', description: 'Enables the flight statistics and reporting module.' },
];

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
  enabledFeatures: z.array(z.string()).default([]),
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
        enabledFeatures: company.enabledFeatures || [],
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
        enabledFeatures: data.enabledFeatures as Feature[],
    };
    const logoFile = data.logo?.[0];
    
    onSubmit(updatedCompanyData, logoFile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
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
                name="enabledFeatures"
                render={() => (
                    <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">Enabled Modules</FormLabel>
                        <FormDescription>
                        Select the modules that this company will have access to.
                        </FormDescription>
                    </div>
                    <div className="space-y-4">
                        {features.map((item) => (
                        <FormField
                            key={item.id}
                            control={form.control}
                            name="enabledFeatures"
                            render={({ field }) => {
                            return (
                                <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                <FormControl>
                                    <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? field.onChange([...(field.value || []), item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                                (value) => value !== item.id
                                            )
                                            )
                                    }}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel className="font-normal">
                                        {item.label}
                                    </FormLabel>
                                    <FormDescription>
                                        {item.description}
                                    </FormDescription>
                                </div>
                                </FormItem>
                            )
                            }}
                        />
                        ))}
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
