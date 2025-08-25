
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Paintbrush, ZoomIn, Eraser, Type, Building, Image as ImageIcon } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useScale } from "@/context/scale-provider"
import { Slider } from "@/components/ui/slider"
import type { Company, ThemeColors } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const appearanceFormSchema = z.object({
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
    headerForeground: z.string().optional(),
    cardForeground: z.string().optional(),
    accent: z.string().optional(),
    sidebarBackground: z.string().optional(),
    sidebarForeground: z.string().optional(),
    sidebarAccent: z.string().optional(),
    font: z.string().optional(),
  }).optional(),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

const ColorInput = ({ name, control, label }: { name: `theme.${keyof AppearanceFormValues['theme']}`, control: any, label: string }) => (
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

const fonts = [
    { label: 'Inter', value: 'var(--font-inter)' },
    { label: 'Roboto', value: 'var(--font-roboto)' },
    { label: 'Lato', value: 'var(--font-lato)' },
    { label: 'Montserrat', value: 'var(--font-montserrat)' },
];

const defaultTheme = {
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

function SettingsPage() {
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { scale, setScale } = useScale();

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
        trademark: '',
        theme: defaultTheme,
    },
  });
  
  React.useEffect(() => {
    if (company) {
      form.reset({
        trademark: company.trademark || '',
        theme: {
            ...defaultTheme,
            ...(company.theme || {}),
        }
      });
    }
  }, [company, form]);

  const handleAppearanceSubmit = async (data: AppearanceFormValues) => {
    if (!company) return;

    let logoUrl = company.logoUrl;
    const logoFile = data.logo?.[0];

    if (logoFile) {
        logoUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(logoFile);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }

    const updatedData: Partial<Company> = {
        trademark: data.trademark,
        theme: { ...defaultTheme, ...(data.theme || {}) },
        logoUrl: logoUrl,
    };
    
    const success = await updateCompany(company.id, updatedData);
    if (success) {
      toast({ title: 'Appearance Updated', description: 'Your new settings have been applied.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    }
  };
  
  const handleResetTheme = async () => {
    if (!company) return;
    form.setValue('theme', defaultTheme);
    const success = await updateCompany(company.id, { theme: defaultTheme });
    if (success) {
        toast({ title: 'Theme Reset', description: 'The theme has been reset to its default settings.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to reset theme.' });
    }
  }

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
      <main className="flex-1 p-4 md:p-8">
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
            <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                Customize the look and feel of the application for your company.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAppearanceSubmit)} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                Branding
                            </h3>
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
                             <FormField
                                control={form.control}
                                name="logo"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Company Logo</FormLabel>
                                    <div className="flex items-center gap-4">
                                        {company?.logoUrl ? (
                                            <Image src={company.logoUrl} alt="Current company logo" width={48} height={48} className="h-12 w-12 rounded-md object-contain bg-muted p-1" />
                                        ) : (
                                            <div className="h-12 w-12 flex items-center justify-center bg-muted rounded-md"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                                        )}
                                        <FormControl>
                                            <Input type="file" accept="image/*" {...form.register('logo')} className="flex-1"/>
                                        </FormControl>
                                    </div>
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
                            <h3 className="font-semibold flex items-center gap-2">
                                <Paintbrush className="h-4 w-4" />
                                Company Theme Colors
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Set your organization's brand colors. These are applied on top of the base theme.
                            </p>
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
                                    <CardHeader className="p-4"><CardTitle className="text-base">Header Text</CardTitle></CardHeader>
                                    <CardContent className="p-4">
                                       <ColorInput name="theme.headerForeground" control={form.control} label="Header" />
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
                                    <CardContent className="p-4">
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
                        </div>

                        <Separator />
                        
                        <div className="space-y-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Type className="h-4 w-4" />
                                Typography
                            </h3>
                            <FormField
                                control={form.control}
                                name="theme.font"
                                render={({ field }) => (
                                    <FormItem className="max-w-sm">
                                        <FormLabel>Application Font</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a font" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {fonts.map(font => (
                                                    <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>


                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={handleResetTheme}>
                                <Eraser className="mr-2 h-4 w-4" />
                                Reset Theme
                            </Button>
                            <Button type="submit">Save Appearance Settings</Button>
                        </div>
                    </form>
                </Form>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Page Scale
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Adjust the overall size of the application UI. This setting is local to your browser.
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-16 text-right">
                      {Math.round(scale * 100)}%
                    </span>
                    <Slider
                      value={[scale]}
                      onValueChange={(value) => setScale(value[0])}
                      min={0.8}
                      max={1.2}
                      step={0.01}
                    />
                  </div>
                </div>
            </CardContent>
            </Card>
        </div>
      </main>
  )
}

SettingsPage.title = 'Appearance Settings';
export default SettingsPage;
