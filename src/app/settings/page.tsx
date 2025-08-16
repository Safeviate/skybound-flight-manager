
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

function SettingsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { scale, setScale } = useScale();

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
            </CardContent>
            </Card>
        </div>
      </main>
  )
}

SettingsPage.title = 'Appearance Settings';
export default SettingsPage;
