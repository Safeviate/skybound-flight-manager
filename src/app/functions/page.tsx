
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

function FunctionsPage() {
  const [pwaEnabled, setPwaEnabled] = useState(true);
  const [welcomeEmailEnabled, setWelcomeEmailEnabled] = useState(true);

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Function Flags</CardTitle>
            <CardDescription>
              Toggle various system-level functions on or off for development and testing purposes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="pwa-enabled" className="text-base">
                  Enable PWA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Turns the Progressive Web App features on or off. Requires a browser refresh.
                </p>
              </div>
              <Switch
                id="pwa-enabled"
                checked={pwaEnabled}
                onCheckedChange={setPwaEnabled}
              />
            </div>
             <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="welcome-email-enabled" className="text-base">
                  Enable Welcome Email with Password
                </Label>
                <p className="text-sm text-muted-foreground">
                  When a new user is created, send them a welcome email containing a temporary password.
                </p>
              </div>
              <Switch
                id="welcome-email-enabled"
                checked={welcomeEmailEnabled}
                onCheckedChange={setWelcomeEmailEnabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

FunctionsPage.title = "Function Flags";

export default FunctionsPage;
