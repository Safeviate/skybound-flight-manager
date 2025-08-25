
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
import type { Company, User, Feature, NavMenuItem } from '@/lib/types';
import { Paintbrush, Type } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';
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

const allFeatures = featureGroups.flatMap(g => g.features);

const fonts = [
    { label: 'Inter', value: 'var(--font-inter)' },
    { label: 'Roboto', value: 'var(--font-roboto)' },
    { label: 'Lato', value: 'var(--font-lato)' },
    { label: 'Montserrat', value: 'var(--font-montserrat)' },
];


const companyFormSchema = z.object({
  companyName: z.string().min(2, 'Company name is required.'),
  logo: z.any().optional(),
  enabledFeatures: z.array(z.string()).default([]),
  visibleMenuItems: z.array(z.string()).default(allNavMenuItems),
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
  adminName: z.string().min(2, 'Admin name is required.'),
  adminEmail: z.string().email('A valid admin email is required.'),
  adminPhone: z.string().min(1, 'Admin phone number is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface NewCompanyFormProps {
  onSubmit: (companyData: Omit<Company, 'id' | 'trademark'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string, logoFile?: File) => void;
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

const defaultThemeValues = {
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


export function NewCompanyForm({ onSubmit }: NewCompanyFormProps) {

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
        companyName: '',
        enabledFeatures: allFeatures.map(f => f.id),
        visibleMenuItems: allNavMenuItems,
        theme: defaultThemeValues,
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        password: '',
    }
  });

  useEffect(() => {
    form.reset({
        companyName: '',
        enabledFeatures: allFeatures.map(f => f.id),
        visibleMenuItems: allNavMenuItems,
        theme: defaultThemeValues,
        adminName: '',
        adminEmail: '',
        adminPhone: '',
        password: '',
    });
  }, [form]);

  function handleFormSubmit(data: CompanyFormValues) {
    const newCompany: Omit<Company, 'id' | 'trademark'> = {
        name: data.companyName,
        theme: data.theme,
        enabledFeatures: data.enabledFeatures as Feature[],
    };
    
    const adminData: Omit<User, 'id' | 'companyId'| 'role' | 'permissions'> = {
        name: data.adminName,
        email: data.adminEmail,
        phone: data.adminPhone,
        visibleMenuItems: data.visibleMenuItems as NavMenuItem[],
    };

    const logoFile = data.logo?.[0];

    onSubmit(newCompany, adminData, data.password, logoFile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Company Details</h4>
                <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., AeroVentures Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
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
            
             <div className="space-y-4">
                <h4 className="font-semibold">Initial Administrator Account</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="adminName" render={({ field }) => (
                        <FormItem><FormLabel>Admin Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="adminEmail" render={({ field }) => (
                        <FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input type="email" placeholder="e.g., admin@aero.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="adminPhone" render={({ field }) => (
                        <FormItem><FormLabel>Admin Phone</FormLabel><FormControl><Input placeholder="e.g., +27821234567" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Admin Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
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
                        <CardHeader className="p-4"><CardTitle className="text-base">Sidebar Backgrounds</CardTitle></CardHeader>
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
            
            <Separator />
            
             <FormField
                control={form.control}
                name="visibleMenuItems"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Default Menu Items for New Users</FormLabel>
                            <FormDescription>
                            Select the menu items that will be visible by default for new users in this company.
                            </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {allNavMenuItems.map((item) => (
                                <FormField
                                    key={item}
                                    control={form.control}
                                    name="visibleMenuItems"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(item)}
                                                    onCheckedChange={(checked) => {
                                                        const newItems = checked
                                                            ? [...(field.value || []), item]
                                                            : field.value?.filter((label) => label !== item);
                                                        field.onChange(newItems);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">{item}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Separator />

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
                    <div className="space-y-6">
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
          <Button type="submit">Create Company</Button>
        </div>
      </form>
    </Form>
  );
}
