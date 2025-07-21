
'use client';

import { useSettings } from '@/context/settings-provider';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function OperationalSettingsPage() {
  const { settings, setSettings } = useSettings();

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Operational Settings" />
      <main className="flex-1 p-4 md:p-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Operational Rules & Workflow</CardTitle>
            <CardDescription>
              Enable or disable specific operational rules for the entire system.
              These settings typically require manager-level permissions to change.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enforce-pre-flight" className="text-base">
                  Enforce Pre-Flight Checks
                </Label>
                <p className="text-sm text-muted-foreground">
                  Prevent approval of a flight booking until the pre-flight checklist for that specific flight is complete.
                </p>
              </div>
              <Switch
                id="enforce-pre-flight"
                checked={settings.enforcePreFlightCheck}
                onCheckedChange={() => handleToggle('enforcePreFlightCheck')}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enforce-post-flight" className="text-base">
                  Enforce Post-Flight Checks
                </Label>
                <p className="text-sm text-muted-foreground">
                  Prevent approval of a new flight booking until the previous flight's post-flight checklist for that aircraft is complete.
                </p>
              </div>
              <Switch
                id="enforce-post-flight"
                checked={settings.enforcePostFlightCheck}
                onCheckedChange={() => handleToggle('enforcePostFlightCheck')}
              />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
