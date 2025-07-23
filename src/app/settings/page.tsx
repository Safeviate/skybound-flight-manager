
"use client"

import { useTheme } from "next-themes"
import Header from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Moon, Sun, Monitor } from "lucide-react"
import { useUser } from "@/context/user-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SettingsPage() {
  const { setTheme } = useTheme()
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Appearance Settings" />
            <div className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Appearance Settings" />
      <main className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold">Theme</h3>
            <p className="text-sm text-muted-foreground">
              Select the theme for the application. "System" will match your
              operating system's appearance.
            </p>
            <div className="flex gap-2">
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
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
