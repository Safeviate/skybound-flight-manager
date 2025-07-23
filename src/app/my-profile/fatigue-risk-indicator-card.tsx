

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { calculateFlightHours } from '@/lib/utils.tsx';
import type { Role, TrainingLogEntry } from '@/lib/types';

interface FatigueRiskIndicatorCardProps {
    userRole: Role;
    trainingLogs: TrainingLogEntry[];
}

const FLIGHT_TIME_LIMITS = {
    daily: 8,      // 8 hours in any 24-hour period
    weekly: 30,    // 30 hours in any 7-day period
    monthly: 100,  // 100 hours in any 30-day period
};

const getProgressColor = (percentage: number) => {
    if (percentage > 90) return 'hsl(var(--destructive))';
    if (percentage > 75) return 'hsl(var(--orange))';
    if (percentage > 50) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
}


export function FatigueRiskIndicatorCard({ userRole, trainingLogs }: FatigueRiskIndicatorCardProps) {
    const hours24 = useMemo(() => calculateFlightHours(trainingLogs, 1), [trainingLogs]);
    const hours7d = useMemo(() => calculateFlightHours(trainingLogs, 7), [trainingLogs]);
    const hours30d = useMemo(() => calculateFlightHours(trainingLogs, 30), [trainingLogs]);

    const dailyPercentage = (hours24 / FLIGHT_TIME_LIMITS.daily) * 100;
    const weeklyPercentage = (hours7d / FLIGHT_TIME_LIMITS.weekly) * 100;
    const monthlyPercentage = (hours30d / FLIGHT_TIME_LIMITS.monthly) * 100;
  
    return (
        <Card>
            <CardHeader>
                <CardTitle>Flight & Duty Monitoring</CardTitle>
                <CardDescription>
                    Cumulative flight hours based on South African regulations.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Last 24 Hours</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={dailyPercentage} indicatorClassName={getProgressColor(dailyPercentage)} />
                        <span className="font-semibold w-24 text-right">{hours24} / {FLIGHT_TIME_LIMITS.daily} hrs</span>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Last 7 Days</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={weeklyPercentage} indicatorClassName={getProgressColor(weeklyPercentage)} />
                        <span className="font-semibold w-24 text-right">{hours7d} / {FLIGHT_TIME_LIMITS.weekly} hrs</span>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label>Last 30 Days</Label>
                    <div className="flex items-center gap-4">
                        <Progress value={monthlyPercentage} indicatorClassName={getProgressColor(monthlyPercentage)} />
                        <span className="font-semibold w-24 text-right">{hours30d} / {FLIGHT_TIME_LIMITS.monthly} hrs</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
