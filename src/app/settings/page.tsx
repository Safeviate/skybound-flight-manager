
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor, Paintbrush } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

const themeFormSchema = z.object({
  primaryColor: z.string(),
  backgroundColor: z.string(),
  accentColor: z.string(),
})

type ThemeFormValues = z.infer<typeof themeFormSchema>

function SettingsPage() {
  const { setTheme } = useTheme()
  const { user, company, updateCompany, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast()

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      primaryColor: company?.theme?.primary || '#2563eb',
      backgroundColor: company?.theme?.background || '#f4f4f5',
      accentColor: company?.theme?.accent || '#f59e0b',
    },
  });

  React.useEffect(() => {
    if (company?.theme) {
      form.reset({
        primaryColor: company.theme.primary || '#2563eb',
        backgroundColor: company.theme.background || '#f4f4f5',
        accentColor: company.theme.accent || '#f59e0b',
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

    const theme = {
      primary: data.primaryColor,
      background: data.backgroundColor,
      accent: data.accentColor,
    };
    
    const success = await updateCompany({ theme });

    if (success) {
      toast({
        title: 'Theme Updated',
        description: 'Your new theme colors have been saved and applied.',
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
        <Card className="max-w-2xl mx-auto">
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
                <Button variant="outline" onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button variant="outline" onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
                <Button variant="outline" onClick={() => setTheme("system")}>
                  <Monitor className="mr-2 h-4 w-4" />
                  System
                </Button>
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
                    Set your organization's brand colors. These will be applied throughout the application.
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
      </main>
  )
}

SettingsPage.title = 'Appearance Settings';
export default SettingsPage;
