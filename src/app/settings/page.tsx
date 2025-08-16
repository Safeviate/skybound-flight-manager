
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Paintbrush, ZoomIn, Eraser } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useScale } from "@/context/scale-provider"
import { Slider } from "@/components/ui/slider"

const hexColorRegex = /^#([0-9a-f]{3}){1,2}$/i;

const themeFormSchema = z.object({
  primary: z.string().regex(hexColorRegex, 'Invalid hex color'),
  background: z.string().regex(hexColorRegex, 'Invalid hex color'),
  accent: z.string().regex(hexColorRegex, 'Invalid hex color'),
  sidebarBackground: z.string().regex(hexColorRegex, 'Invalid hex color'),
  sidebarAccent: z.string().regex(hexColorRegex, 'Invalid hex color'),
})

type ThemeFormValues = z.infer<typeof themeFormSchema>

const defaultTheme = {
  primary: '#2563eb',
  background: '#f4f4f5',
  accent: '#f59e0b',
  sidebarBackground: '#0c0a09',
  sidebarAccent: '#1f2937'
};

function SettingsPage() {
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast()
  const { scale, setScale } = useScale();

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primary: company?.theme?.primary || defaultTheme.primary,
      background: company?.theme?.background || defaultTheme.background,
      accent: company?.theme?.accent || defaultTheme.accent,
      sidebarBackground: company?.theme?.sidebarBackground || defaultTheme.sidebarBackground,
      sidebarAccent: company?.theme?.sidebarAccent || defaultTheme.sidebarAccent,
    },
  });
  
  React.useEffect(() => {
    if (company?.theme) {
      form.reset({
        primary: company.theme.primary || defaultTheme.primary,
        background: company.theme.background || defaultTheme.background,
        accent: company.theme.accent || defaultTheme.accent,
        sidebarBackground: company.theme.sidebarBackground || defaultTheme.sidebarBackground,
        sidebarAccent: company.theme.sidebarAccent || defaultTheme.sidebarAccent,
      });
    }
  }, [company, form]);
  
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const handleThemeSubmit = async (data: ThemeFormValues) => {
    if (!company) return;

    const newThemeSettings = {
      primary: data.primary,
      background: data.background,
      accent: data.accent,
      sidebarBackground: data.sidebarBackground,
      sidebarAccent: data.sidebarAccent,
    };
    
    const success = await updateCompany({ theme: newThemeSettings });
    
    if (success) {
      toast({
        title: 'Theme Updated',
        description: 'Your new theme colors have been saved.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Could not save your theme. Please try again.',
      });
    }
  };

  const handleResetTheme = async () => {
    if (!company) return;
    const success = await updateCompany({ theme: defaultTheme });

    if (success) {
        form.reset(defaultTheme);
        toast({
            title: 'Theme Reset',
            description: 'The theme has been reset to its default colors.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: 'Could not reset the theme. Please try again.',
        });
    }
  };

  if (loading || !user) {
    return (
        <main className="flex-1 flex items-center justify-center">
            <p>Loading...</p>
        </main>
    );
  }

  return (
      <main className="flex-1 p-4 md:p-8">
        <div className="space-y-6 max-w-2xl mx-auto">
            <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                Customize the look and feel of the application.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

                <Separator />

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 p-4 border rounded-md">
                            <h4 className="font-medium text-sm">Main UI Colors</h4>
                             <div className="grid grid-cols-3 gap-2 pt-2">
                                <FormField control={form.control} name="primary" render={({ field }) => (<FormItem><FormLabel>Primary</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="background" render={({ field }) => (<FormItem><FormLabel>Background</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="accent" render={({ field }) => (<FormItem><FormLabel>Accent</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                         <div className="space-y-2 p-4 border rounded-md">
                            <h4 className="font-medium text-sm">Sidebar Menu Colors</h4>
                             <div className="grid grid-cols-2 gap-2 pt-2">
                                <FormField control={form.control} name="sidebarBackground" render={({ field }) => (<FormItem><FormLabel>Menu Background</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="sidebarAccent" render={({ field }) => (<FormItem><FormLabel>Menu Highlight</FormLabel><FormControl><Input type="color" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleResetTheme}>
                            <Eraser className="mr-2 h-4 w-4" />
                            Reset Theme
                        </Button>
                        <Button type="submit">Save Theme</Button>
                    </div>
                </form>
                </Form>
            </CardContent>
            </Card>
        </div>
      </main>
  )
}

SettingsPage.title = 'Appearance Settings';
export default SettingsPage;
