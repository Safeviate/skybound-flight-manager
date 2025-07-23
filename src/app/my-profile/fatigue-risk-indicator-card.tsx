

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { calculateFlightHours } from '@/lib/utils.tsx';
import type { Role, TrainingLogEntry } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';

const getProgressColor = (percentage: number) => {
    if (percentage > 90) return 'from-orange-500 to-red-600';
    if (percentage > 75) return 'from-yellow-400 to-orange-500';
    if (percentage > 50) return 'from-green-400 to-yellow-400';
    return 'from-green-500 to-green-400';
}


export function FatigueRiskIndicatorCard({ userRole, trainingLogs }: FatigueRiskIndicatorCardProps) {
    const { settings } = useSettings();
    const flightTimeLimits = {
      daily: settings.dutyLimitDaily,
      weekly: settings.dutyLimitWeekly,
      monthly: settings.dutyLimitMonthly,
    };

    const hours24 = useMemo(() => calculateFlightHours(trainingLogs, 1), [trainingLogs]);
    const hours7d = useMemo(() => calculateFlightHours(trainingLogs, 7), [trainingLogs]);
    const hours30d = useMemo(() => calculateFlightHours(trainingLogs, 30), [trainingLogs]);

    const dailyPercentage = (hours24 / flightTimeLimits.daily) * 100;
    const weeklyPercentage = (hours7d / flightTimeLimits.weekly) * 100;
    const monthlyPercentage = (hours30d / flightTimeLimits.monthly) * 100;
  
    return (
        <Card>
            <CardHeader>
                <CardTitle>Flight & Duty Monitoring</CardTitle>
                <CardDescription>
                    Cumulative flight hours based on company and regulatory limits.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Last 24 Hours</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={dailyPercentage} indicatorClassName={`bg-gradient-to-r ${getProgressColor(dailyPercentage)}`} />
                        <span className="font-semibold w-24 text-right">{hours24} / {flightTimeLimits.daily} hrs</span>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Last 7 Days</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={weeklyPercentage} indicatorClassName={`bg-gradient-to-r ${getProgressColor(weeklyPercentage)}`} />
                        <span className="font-semibold w-24 text-right">{hours7d} / {flightTimeLimits.weekly} hrs</span>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Last 30 Days</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={monthlyPercentage} indicatorClassName={`bg-gradient-to-r ${getProgressColor(monthlyPercentage)}`} />
                        <span className="font-semibold w-24 text-right">{hours30d} / {flightTimeLimits.monthly} hrs</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
