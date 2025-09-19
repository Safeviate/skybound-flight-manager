
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
import type { Company, Feature, NavMenuItem } from '@/lib/types';
import { Paintbrush, Type, Check, Building, KeyRound, Palette, Wand2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';
import { navItems, adminNavItems } from '@/components/layout/nav';

const allNavMenuItems = [...navItems, ...adminNavItems].map(item => item.label);

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const companyFormSchema = z.object({
  name: z.string().min(2, 'Company name is required.'),
  trademark: z.string().min(2, "Trademark is required."),
  logo: z
    .any()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE,
      `Max file size is 500KB.`
    )
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  theme: z.object({
    primary: z.string().optional(),
    background: z.string().optional(),
    card: z.string().optional(),
    foreground: z.string().optional(),
    cardForeground: z.string().optional(),
    headerForeground: z.string().optional(),
    accent: z.string().optional(),
    sidebarBackground: z.string().optional(),
    sidebarForeground: z.string().optional(),
    sidebarAccent: z.string().optional(),
    font: z.string().optional(),
  }).optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface NewCompanyFormProps {
  onSubmit: (companyData: Omit<Company, 'id'>, logoFile?: File) => void;
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
    headerForeground: '#212529',
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
        name: '',
        trademark: '',
        theme: defaultThemeValues,
    }
  });

  useEffect(() => {
    form.reset({
        name: '',
        trademark: 'Your Trusted Partner in Aviation',
        theme: defaultThemeValues,
    });
  }, [form]);

  function handleFormSubmit(data: CompanyFormValues) {
    const { logo, ...companyData } = data;
    const logoFile = data.logo?.[0];
    onSubmit(companyData, logoFile);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="space-y-4">
             <h3 className="text-lg font-semibold">Company Details</h3>
            <FormField
                control={form.control}
                name="name"
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
                name="trademark"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Trademark / Slogan</FormLabel>
                    <FormControl>
                        <Input {...field} />
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
                        <FormDescription>
                        Max file size: 500KB. Accepted types: JPG, PNG, WEBP.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <Separator />

        <div className="space-y-4">
             <h3 className="text-lg font-semibold flex items-center gap-2"><Wand2 className="h-5 w-5"/> Company Theme</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
             </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg">Create Company</Button>
        </div>
      </form>
    </Form>
  );
}
