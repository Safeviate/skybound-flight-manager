
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSettings } from '@/context/settings-provider';
import type { Booking, QualityAudit, SafetyReport, User } from '@/lib/types';
import { calculateFlightHours } from '@/lib/utils';
import { AlertTriangle, BookUser, CheckSquare, FileText, Gauge, Loader2, ShieldAlert, Users, BookOpen } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';

interface AtAGlanceCardProps {
  user: User | null;
  bookings: Booking[];
  openSafetyReports: SafetyReport[];
  openQualityAudits: QualityAudit[];
  assignedStudents: User[];
  isLoading: boolean;
}

const DutyTimeIndicator = ({ label, hours, limit }: { label: string, hours: number, limit: number }) => {
    const percentage = Math.min((hours / limit) * 100, 100);
    let colorClass = 'bg-success';
    if (percentage > 90) colorClass = 'bg-destructive';
    else if (percentage > 75) colorClass = 'bg-orange';
    else if (percentage > 50) colorClass = 'bg-warning';
    
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-sm text-muted-foreground">{hours.toFixed(1)} / {limit} hrs</span>
            </div>
            <Progress value={percentage} indicatorClassName={colorClass} />
        </div>
    );
};


export function AtAGlanceCard({ user, bookings, openSafetyReports, openQualityAudits, assignedStudents, isLoading }: AtAGlanceCardProps) {
  const { settings } = useSettings();

  const flightHours = useMemo(() => {
    if (!user) return { daily: 0, weekly: 0, monthly: 0 };
    const userBookings = bookings.filter(b => b.instructor === user.name || b.student === user.name);
    return {
        daily: calculateFlightHours(userBookings, 1),
        weekly: calculateFlightHours(userBookings, 7),
        monthly: calculateFlightHours(userBookings, 30),
    };
  }, [user, bookings]);

  if (isLoading) {
    return (
        <Card>
            <CardContent className="flex items-center justify-center h-48">
                 <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            </CardContent>
        </Card>
    );
  }

  if (!user) return null;

  const renderContent = () => {
    switch (user.role) {
      case 'Student':
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                     <Gauge className="h-6 w-6 text-primary flex-shrink-0"/>
                    <div className="flex-1">
                        <p className="font-semibold">Training Progress</p>
                        <Progress value={user.progress || 0} className="mt-1"/>
                    </div>
                     <span className="font-bold text-lg">{user.progress || 0}%</span>
                </div>
                 <div className="flex items-center gap-4">
                     <BookUser className="h-6 w-6 text-primary flex-shrink-0"/>
                     <p className="font-semibold">Total Flight Hours: {user.flightHours?.toFixed(1) || 0}</p>
                 </div>
                 <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/students/${user.id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            View My Logbook
                        </Link>
                    </Button>
                </div>
            </div>
        );
      case 'Instructor':
      case 'Chief Flight Instructor':
      case 'Head Of Training':
         return (
             <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-sm mb-2">My Flight & Duty Hours</h4>
                    <div className="space-y-3">
                        <DutyTimeIndicator label="Today" hours={flightHours.daily} limit={settings.dutyLimitDaily} />
                        <DutyTimeIndicator label="Last 7 Days" hours={flightHours.weekly} limit={settings.dutyLimitWeekly} />
                        <DutyTimeIndicator label="Last 30 Days" hours={flightHours.monthly} limit={settings.dutyLimitMonthly} />
                    </div>
                </div>
                {assignedStudents.length > 0 && (
                     <div>
                        <h4 className="font-semibold text-sm mb-2">My Students ({assignedStudents.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {assignedStudents.map(s => (
                                 <Button key={s.id} variant="secondary" size="sm" asChild className="h-auto py-1">
                                    <Link href={`/students/${s.id}`}>{s.name}</Link>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
        case 'Safety Manager':
            return (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <ShieldAlert className="h-8 w-8 text-destructive flex-shrink-0"/>
                        <div>
                            <p className="text-2xl font-bold">{openSafetyReports.length}</p>
                            <p className="text-sm text-muted-foreground">Open Safety Reports</p>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/safety?tab=reports">
                                Go to Safety Reports
                            </Link>
                        </Button>
                    </div>
                </div>
            )
        case 'Quality Manager':
            return (
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <CheckSquare className="h-8 w-8 text-primary flex-shrink-0"/>
                        <div>
                            <p className="text-2xl font-bold">{openQualityAudits.length}</p>
                            <p className="text-sm text-muted-foreground">Open Quality Audits</p>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/quality?tab=audits">
                                Go to Quality Audits
                            </Link>
                        </Button>
                    </div>
                </div>
            )
      default: // For pilots, admins, etc.
        return (
             <div className="space-y-4">
                <h4 className="font-semibold text-sm mb-2">My Flight & Duty Hours</h4>
                <div className="space-y-3">
                    <DutyTimeIndicator label="Today" hours={flightHours.daily} limit={settings.dutyLimitDaily} />
                    <DutyTimeIndicator label="Last 7 Days" hours={flightHours.weekly} limit={settings.dutyLimitWeekly} />
                    <DutyTimeIndicator label="Last 30 Days" hours={flightHours.monthly} limit={settings.dutyLimitMonthly} />
                </div>
            </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>At a Glance</CardTitle>
        <CardDescription>Your role-specific overview.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
