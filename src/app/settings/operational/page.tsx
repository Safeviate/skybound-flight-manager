
'use client';

import { useSettings } from '@/context/settings-provider';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const REGULATORY_LIMITS = {
  daily: 8,
  weekly: 30,
  monthly: 100,
};

export default function OperationalSettingsPage() {
  const { settings, setSettings } = useSettings();
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  
  const handleLimitChange = (key: 'dutyLimitDaily' | 'dutyLimitWeekly' | 'dutyLimitMonthly', value: string, max: number) => {
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      setSettings(prev => ({
        ...prev,
        [key]: Math.min(numericValue, max), // Ensure value does not exceed regulatory max
      }));
    }
  };

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Operational Settings" />
            <div className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

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
            <div className="space-y-2">
                <h3 className="font-semibold text-lg">Checklist Enforcement</h3>
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
                <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="enforce-post-maintenance" className="text-base">
                    Enforce Post-Maintenance Checks
                    </Label>
                    <p className="text-sm text-muted-foreground">
                    Prevent an aircraft from being booked if it is in maintenance until a maintenance checklist is completed.
                    </p>
                </div>
                <Switch
                    id="enforce-post-maintenance"
                    checked={settings.enforcePostMaintenanceCheck}
                    onCheckedChange={() => handleToggle('enforcePostMaintenanceCheck')}
                />
                </div>
            </div>

            <Separator />
            
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Flight & Duty Limits</h3>
                <p className="text-sm text-muted-foreground">
                    Set company-specific flight hour limits. These cannot exceed regulatory maximums.
                </p>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="daily-limit">Daily Limit (Max: {REGULATORY_LIMITS.daily} hrs)</Label>
                        <Input
                            id="daily-limit"
                            type="number"
                            value={settings.dutyLimitDaily}
                            onChange={e => handleLimitChange('dutyLimitDaily', e.target.value, REGULATORY_LIMITS.daily)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="weekly-limit">Weekly Limit (Max: {REGULATORY_LIMITS.weekly} hrs)</Label>
                        <Input
                            id="weekly-limit"
                            type="number"
                            value={settings.dutyLimitWeekly}
                            onChange={e => handleLimitChange('dutyLimitWeekly', e.target.value, REGULATORY_LIMITS.weekly)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="monthly-limit">Monthly Limit (Max: {REGULATORY_LIMITS.monthly} hrs)</Label>
                        <Input
                            id="monthly-limit"
                            type="number"
                            value={settings.dutyLimitMonthly}
                            onChange={e => handleLimitChange('dutyLimitMonthly', e.target.value, REGULATORY_LIMITS.monthly)}
                        />
                    </div>
                </div>
            </div>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
