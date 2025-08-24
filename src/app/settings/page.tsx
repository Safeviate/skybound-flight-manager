
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Paintbrush, ZoomIn, Eraser, Type } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useScale } from "@/context/scale-provider"
import { Slider } from "@/components/ui/slider"
import type { ThemeColors } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const themeFormSchema = z.object({
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
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

const ColorInput = ({ name, control, label }: { name: keyof ThemeFormValues, control: any, label: string }) => (
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

function SettingsPage() {
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { scale, setScale } = useScale();

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: company?.theme || {},
  });
  
  React.useEffect(() => {
    if (company?.theme) {
      form.reset(company.theme);
    }
  }, [company, form]);

  const handleThemeSubmit = async (data: ThemeFormValues) => {
    const success = await updateCompany({ theme: data as ThemeColors });
    if (success) {
      toast({ title: 'Theme Updated', description: 'Your new theme has been applied.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update theme.' });
    }
  };
  
  const handleResetTheme = () => {
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
    form.reset(defaultTheme);
    updateCompany({ theme: defaultTheme });
    toast({ title: 'Theme Reset', description: 'The theme has been reset to its default settings.' });
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
                Customize the look and feel of the application.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleThemeSubmit)} className="space-y-6">
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
                                        <ColorInput name="background" control={form.control} label="Background" />
                                        <ColorInput name="card" control={form.control} label="Card" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Main Text</CardTitle></CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                    <ColorInput name="foreground" control={form.control} label="Foreground" />
                                    <ColorInput name="cardForeground" control={form.control} label="Card Text" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Accents</CardTitle></CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                        <ColorInput name="primary" control={form.control} label="Primary" />
                                        <ColorInput name="accent" control={form.control} label="Accent" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Sidebar Background</CardTitle></CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                        <ColorInput name="sidebarBackground" control={form.control} label="Sidebar" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="p-4"><CardTitle className="text-base">Sidebar Text</CardTitle></CardHeader>
                                    <CardContent className="p-4 grid grid-cols-2 gap-4">
                                    <ColorInput name="sidebarForeground" control={form.control} label="Foreground" />
                                    <ColorInput name="sidebarAccent" control={form.control} label="Accent" />
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
                                name="font"
                                render={({ field }) => (
                                    <FormItem className="max-w-sm">
                                        <FormLabel>Application Font</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                Reset All
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
                    Adjust the overall size of the application UI.
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
