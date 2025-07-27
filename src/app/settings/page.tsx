
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor, Paintbrush, ZoomIn } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { useScale } from "@/context/scale-provider"
import { Slider } from "@/components/ui/slider"

const themeFormSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type ThemeFormValues = z.infer<typeof themeFormSchema>

const hexToHSL = (hex: string): string | null => {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else {
        return null;
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
};

const applyTheme = (theme: { primary?: string, background?: string, accent?: string }) => {
    const root = document.documentElement;
    const themeProperties = {
        '--primary': hexToHSL(theme.primary as string),
        '--background': hexToHSL(theme.background as string),
        '--accent': hexToHSL(theme.accent as string),
    };

    for (const [property, value] of Object.entries(themeProperties)) {
        if (value) {
            root.style.setProperty(property, value);
        } else {
            root.style.removeProperty(property);
        }
    }
};

const clearCustomTheme = () => {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--background');
    root.style.removeProperty('--accent');
}

function SettingsPage() {
  const { theme, setTheme, systemTheme } = useTheme()
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast()
  const { scale, setScale } = useScale();

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primaryColor: '#2563eb',
      backgroundColor: '#f4f4f5',
      accentColor: '#f59e0b',
    },
  });
  
  React.useEffect(() => {
    if (company?.theme) {
      form.reset({
        primaryColor: company.theme.primary || '#2563eb',
        backgroundColor: company.theme.background || '#f4f4f5',
        accentColor: company.theme.accent || '#f59e0b',
      });
      // Apply theme on initial load if system theme is selected
      if (theme === 'system') {
          applyTheme(company.theme);
      }
    }
  }, [company, form, theme]);
  
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (newTheme === 'system' && company?.theme) {
        applyTheme(company.theme);
    } else {
        clearCustomTheme();
    }
  }

  const handleThemeSubmit = async (data: ThemeFormValues) => {
    if (!company) return;

    const newThemeSettings = {
      primary: data.primaryColor,
      background: data.backgroundColor,
      accent: data.accentColor,
    };
    
    const success = await updateCompany({ theme: newThemeSettings });
    
    if (success) {
      if (theme === 'system') {
        applyTheme(newThemeSettings);
      }
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
                <div>
                <h3 className="font-semibold">Color Mode</h3>
                <p className="text-sm text-muted-foreground">
                    Select the theme for the application. "System" will match your
                    operating system's appearance.
                </p>
                <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => handleThemeChange("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                    </Button>
                    <Button variant="outline" onClick={() => handleThemeChange("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                    </Button>
                    <Button variant="outline" onClick={() => handleThemeChange("system")}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                    </Button>
                </div>
                </div>

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

                <Separator />

                <Form {...form}>
                <form onSubmit={form.handleSubmit(handleThemeSubmit)} className="space-y-6">
                    <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Paintbrush className="h-4 w-4" />
                        Company Theme Colors
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Set your organization's brand colors. These will only be applied when the color mode is set to "System".
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Primary</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Background</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Accent</FormLabel>
                            <FormControl>
                                <Input type="color" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </div>
                    </div>
                    <div className="flex justify-end">
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
