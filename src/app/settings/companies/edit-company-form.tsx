
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
import { Paintbrush, Type } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { navItems, adminNavItems } from '@/components/layout/nav';

const allNavMenuItems = [...navItems, ...adminNavItems].map(item => item.label);


const featureGroups: { title: string; features: { id: Feature, label: string, description: string }[] }[] = [
    {
        title: 'Core Operations',
        features: [
            { id: 'Aircraft', label: 'Aircraft Management', description: 'Enables fleet management, document tracking, and checklists.' },
            { id: 'Bookings', label: 'Flight Scheduling', description: 'Enables the aircraft and personnel scheduling system.' },
        ]
    },
    {
        title: 'Personnel & Training',
        features: [
            { id: 'Personnel', label: 'Personnel Management', description: 'Enables management of staff and non-student personnel records.' },
            { id: 'Students', label: 'Student Management', description: 'Enables tracking of student training progress, logs, and endorsements.' },
        ]
    },
    {
        title: 'Safety & Quality',
        features: [
            { id: 'Safety', label: 'Safety Management', description: 'Enables the Safety Management System (SMS) module for incident reporting and risk management.' },
            { id: 'Quality', label: 'Quality Management', description: 'Enables the Quality Management System (QMS) module for audits and compliance.' },
        ]
    },
    {
        title: 'Data & Analytics',
        features: [
            { id: 'AdvancedAnalytics', label: 'Advanced Analytics', description: 'Enables the flight statistics and reporting module.' },
        ]
    }
];

const fonts = [
    { label: 'Inter', value: 'var(--font-inter)' },
    { label: 'Roboto', value: 'var(--font-roboto)' },
    { label: 'Lato', value: 'var(--font-lato)' },
    { label: 'Montserrat', value: 'var(--font-montserrat)' },
];

const companyFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Company name must be at least 2 characters.',
  }),
  trademark: z.string().min(2, {
    message: 'Trademark must be at least 2 characters.',
  }),
  logo: z.any().optional(),
  enabledFeatures: z.array(z.string()).default([]),
  theme: z.object({
    primary: z.string().optional(),
    background: z.string().optional(),
    card: z.string().optional(),
    foreground: z.string().optional(),
    cardForeground: z.string().optional(),
    accent: z.string().optional(),
    sidebarBackground: z.string().optional(),
    sidebarForeground: z.string().optional(),
    sidebarAccent: z.string().optional(),
    font: z.string().optional(),
  }).optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface EditCompanyFormProps {
    company: Company;
    onSubmit: (updatedData: Partial<Company>, logoFile?: File) => void;
}

const ColorInput = ({ name, control, label }: { name: `theme.${keyof CompanyFormValues['theme']}`, control: any, label: string }) => (
    <FormField
        control={control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                    <Input type="color" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
            </FormItem>
        )}
    />
);

export function EditCompanyForm({ company, onSubmit }: EditCompanyFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
  });

  useEffect(() => {
    const defaultTheme = {
        primary: '#0d6efd',
        background: '#f8f9fa',
        card: '#ffffff',
        accent: '#ffc107',
        foreground: '#212529',
        cardForeground: '#212529',
        sidebarBackground: '#0c0a09',
        sidebarForeground: '#f8f9fa',
        sidebarAccent: '#1f2937',
        font: 'var(--font-inter)',
    };

    form.reset({
        name: company.name,
        trademark: company.trademark || '',
        enabledFeatures: company.enabledFeatures || [],
        theme: {
          ...defaultTheme,
          ...company.theme,
        },
    })
  }, [company, form]);

  function handleFormSubmit(data: CompanyFormValues) {
    const updatedCompanyData: Partial<Company> = {
        name: data.name,
        trademark: data.trademark,
        enabledFeatures: data.enabledFeatures as Feature[],
        theme: data.theme,
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
                            <Input placeholder="e.g., Flying High Since 2002" {...field} value={field.value || ''}/>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4">
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
            
            <Separator />
            
             <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2"><Paintbrush className="h-4 w-4"/>Company Theme</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader className="p-4"><CardTitle className="text-base">Main Backgrounds</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                            <ColorInput name="theme.background" control={form.control} label="Background" />
                            <ColorInput name="theme.card" control={form.control} label="Card" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-base">Main Text</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                           <ColorInput name="theme.foreground" control={form.control} label="Foreground" />
                           <ColorInput name="theme.cardForeground" control={form.control} label="Card Text" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-base">Accents</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                            <ColorInput name="theme.primary" control={form.control} label="Primary" />
                            <ColorInput name="theme.accent" control={form.control} label="Accent" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="p-4"><CardTitle className="text-base">Sidebar Background</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                            <ColorInput name="theme.sidebarBackground" control={form.control} label="Sidebar" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-4"><CardTitle className="text-base">Sidebar Text</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-4">
                           <ColorInput name="theme.sidebarForeground" control={form.control} label="Foreground" />
                           <ColorInput name="theme.sidebarAccent" control={form.control} label="Accent" />
                        </CardContent>
                    </Card>
                </div>
                 <FormField
                    control={form.control}
                    name="theme.font"
                    render={({ field }) => (
                        <FormItem className="pt-4">
                            <FormLabel className="flex items-center gap-2"><Type className="h-4 w-4" /> Company Font</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a font" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {fonts.map(font => <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                        {featureGroups.map((group) => (
                          <div key={group.title}>
                            <h4 className="font-semibold text-sm mb-3">{group.title}</h4>
                            <div className="space-y-4">
                              {group.features.map((item) => (
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
                          </div>
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
