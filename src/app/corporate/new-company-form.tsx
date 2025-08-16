
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
import { useToast } from '@/hooks/use-toast';
import type { Company, User, Feature } from '@/lib/types';
import { Paintbrush } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

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


const companyFormSchema = z.object({
  companyName: z.string().min(2, 'Company name is required.'),
  logo: z.any().optional(),
  enabledFeatures: z.array(z.string()).default([]),
  adminName: z.string().min(2, 'Admin name is required.'),
  adminEmail: z.string().email('Please enter a valid email address.'),
  theme: z.object({
    primary: z.string().optional(),
    background: z.string().optional(),
    accent: z.string().optional(),
    sidebarBackground: z.string().optional(),
    sidebarAccent: z.string().optional(),
  }).optional(),
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
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input placeholder="#ffffff" {...field} />
                    </FormControl>
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: field.value || 'transparent' }} />
                </div>
                <FormMessage />
            </FormItem>
        )}
    />
);

export function NewCompanyForm({ onSubmit }: NewCompanyFormProps) {

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
        companyName: '',
        enabledFeatures: ['Safety', 'Quality', 'Bookings', 'Aircraft', 'Students', 'Personnel', 'AdvancedAnalytics'],
        theme: {
            primary: '#2563eb',
            background: '#f4f4f5',
            accent: '#f59e0b',
            sidebarBackground: '#0c0a09',
            sidebarAccent: '#1f2937',
        }
    }
  });

  function handleFormSubmit(data: CompanyFormValues) {
    const newCompany: Omit<Company, 'id' | 'trademark'> = {
        name: data.companyName,
        theme: data.theme,
        enabledFeatures: data.enabledFeatures as Feature[],
    };
    const newAdmin: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'> = {
        name: data.adminName,
        email: data.adminEmail,
        phone: '', // Can be added later
    };

    const logoFile = data.logo?.[0];

    // Use a default password for the demo environment
    onSubmit(newCompany, newAdmin, "password", logoFile);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold">Company & Administrator Details</h4>
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
                    name="adminName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Admin Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Jane Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                            <Input placeholder="admin@yourcompany.com" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <Separator />
            
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
                 <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Paintbrush className="h-4 w-4"/>App Theming (Optional)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <ColorInput name="theme.primary" control={form.control} label="Primary" />
                        <ColorInput name="theme.background" control={form.control} label="Background" />
                        <ColorInput name="theme.accent" control={form.control} label="Accent" />
                        <ColorInput name="theme.sidebarBackground" control={form.control} label="Sidebar" />
                        <ColorInput name="theme.sidebarAccent" control={form.control} label="Sidebar Accent" />
                    </div>
                </div>
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
          <Button type="submit">Create Administrator Account</Button>
        </div>
      </form>
    </Form>
  );
}
