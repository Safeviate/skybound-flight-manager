

'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User as UserIcon, Briefcase, Calendar as CalendarIcon, Edit, ClipboardCheck, MessageSquareWarning, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Booking, Checklist, User as AppUser, Aircraft, Risk, SafetyReport, TrainingLogEntry } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO, isBefore, differenceInDays, isSameDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditProfileForm } from './edit-profile-form';
import { ChecklistCard } from '../checklists/checklist-card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getExpiryBadge, calculateFlightHours } from '@/lib/utils.tsx';
import { aircraftData, checklistData as initialChecklistData, bookingData as initialBookingData, safetyReportData, riskRegisterData, userData } from '@/lib/data-provider';
import { FatigueRiskIndicatorCard } from './fatigue-risk-indicator-card';
import { useSettings } from '@/context/settings-provider';


export default function MyProfilePage() {
    const { user, company, loading } = useUser();
    const router = useRouter();
    const { settings } = useSettings();

    const flightTimeLimits = {
      daily: settings.dutyLimitDaily,
      weekly: settings.dutyLimitWeekly,
      monthly: settings.dutyLimitMonthly,
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    const today = new Date('2024-08-15'); // Hardcoding date for consistent display of mock data

    const [checklists, setChecklists] = useState<Checklist[]>(initialChecklistData);
    const [bookings, setBookings] = useState<Booking[]>(initialBookingData);
    
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(today);

    // This is a simplified aggregation of all logs for demo purposes.
    // In a real app, you would fetch logs specific to the user.
    const allTrainingLogs: TrainingLogEntry[] = useMemo(() => {
      return userData.flatMap(u => u.trainingLogs || []);
    }, []);

    const userLogs = useMemo(() => {
      if (!user) return [];
      if (user.role === 'Student') {
        return user.trainingLogs || [];
      }
      if (user.role.includes('Instructor')) {
        return allTrainingLogs.filter(log => log.instructorName === user.name);
      }
      return [];
    }, [user, allTrainingLogs]);


    if (loading || !user) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="My Profile" />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>Loading...</p>
                </main>
            </div>
        )
    }

    const companyAircraft = aircraftData.filter(ac => ac.companyId === company?.id);
    const companyChecklists = checklists.filter(c => c.companyId === company?.id);
    const companyBookings = bookings.filter(b => b.companyId === company?.id);

    const handleItemToggle = (toggledChecklist: Checklist) => {
        setChecklists(prevChecklists =>
          prevChecklists.map(c => (c.id === toggledChecklist.id ? toggledChecklist : c))
        );
    };

    const handleChecklistUpdate = (updatedChecklist: Checklist) => {
        handleItemToggle(updatedChecklist); // Persist final state
    
        const isComplete = updatedChecklist.items.every(item => item.completed);
        if (isComplete && updatedChecklist.aircraftId) {
            setBookings(prevBookings => 
                prevBookings.map(booking => {
                    const aircraft = companyAircraft.find(ac => ac.id === updatedChecklist.aircraftId);
                    if (aircraft && booking.aircraft === aircraft.tailNumber && booking.purpose === 'Training' && booking.status === 'Approved') {
                        return { ...booking, isChecklistComplete: true };
                    }
                    return booking;
                })
            )
        }
      };
      
      const handleReset = (checklistId: string) => {
        setChecklists(prevChecklists =>
          prevChecklists.map(c => {
            if (c.id === checklistId) {
              const originalTemplate = initialChecklistData.find(t => t.id === checklistId);
              if (originalTemplate) {
                 return {
                    ...originalTemplate,
                    items: originalTemplate.items.map(item => ({ ...item, completed: false })),
                 };
              }
            }
            return c;
          })
        );
      };

    const userBookings = companyBookings.filter(b => b.instructor === user.name || b.student === user.name);

    const getBookingsForDay = (day: Date | undefined) => {
        if (!day) return [];
        return userBookings
        .filter(booking => isSameDay(parseISO(booking.date), day))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    const bookedDays = userBookings.map(b => parseISO(b.date));
    const selectedDayBookings = getBookingsForDay(selectedDay);

    const getRoleVariant = (role: AppUser['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            case 'Student':
                return 'default'
            default:
                return 'outline'
        }
    }

    const getPurposeVariant = (purpose: Booking['purpose']) => {
        switch (purpose) {
            case 'Training':
                return 'default'
            case 'Maintenance':
                return 'destructive'
            case 'Private':
                return 'secondary'
            default:
                return 'outline'
        }
    }

    const discussionRequests = safetyReportData
        .filter(report => report.companyId === company?.id && report.status !== 'Closed')
        .flatMap(report => (report.discussion || []).map(entry => ({ report, entry })))
        .filter(({ report, entry }) => entry.recipient === user.name);
    
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const riskReviews = riskRegisterData.filter(risk =>
        risk.companyId === company?.id &&
        risk.riskOwner === user.name &&
        risk.status === 'Open' &&
        risk.reviewDate &&
        isBefore(parseISO(risk.reviewDate), thirtyDaysFromNow)
    );

    const personalAlerts: { type: string; date?: string; daysUntil?: number; details: string; variant: 'warning' | 'destructive' }[] = [];

    if (user.medicalExpiry) {
        const daysUntil = differenceInDays(parseISO(user.medicalExpiry), today);
        if (daysUntil <= 60) {
            personalAlerts.push({ 
                type: 'Medical Certificate Expiry', 
                date: user.medicalExpiry, 
                daysUntil,
                details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                variant: daysUntil > 30 ? 'warning' : 'destructive',
            });
        }
    }
    if (user.licenseExpiry) {
        const daysUntil = differenceInDays(parseISO(user.licenseExpiry), today);
        if (daysUntil <= 60) {
            personalAlerts.push({ 
                type: 'Pilot License Expiry', 
                date: user.licenseExpiry, 
                daysUntil,
                details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                variant: daysUntil > 30 ? 'warning' : 'destructive',
             });
        }
    }

    // Fatigue Alerts
    const hours24 = calculateFlightHours(userLogs, 1);
    const hours7d = calculateFlightHours(userLogs, 7);
    const hours30d = calculateFlightHours(userLogs, 30);

    const dutyThreshold = 0.75; // 75% warning threshold
    if (hours24 / flightTimeLimits.daily >= dutyThreshold) {
        personalAlerts.push({
            type: 'Approaching Daily Duty Limit',
            details: `Logged ${hours24} of ${flightTimeLimits.daily} hours`,
            variant: (hours24 / flightTimeLimits.daily) >= 0.9 ? 'destructive' : 'warning',
        });
    }
     if (hours7d / flightTimeLimits.weekly >= dutyThreshold) {
        personalAlerts.push({
            type: 'Approaching Weekly Duty Limit',
            details: `Logged ${hours7d} of ${flightTimeLimits.weekly} hours`,
            variant: (hours7d / flightTimeLimits.weekly) >= 0.9 ? 'destructive' : 'warning',
        });
    }
     if (hours30d / flightTimeLimits.monthly >= dutyThreshold) {
        personalAlerts.push({
            type: 'Approaching Monthly Duty Limit',
            details: `Logged ${hours30d} of ${flightTimeLimits.monthly} hours`,
            variant: (hours30d / flightTimeLimits.monthly) >= 0.9 ? 'destructive' : 'warning',
        });
    }

    const totalTasks = discussionRequests.length + riskReviews.length + personalAlerts.length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile & Roster" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>My Action Items ({totalTasks})</CardTitle>
                <CardDescription>Alerts and tasks assigned to you that require your attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {totalTasks > 0 ? (
                    <>
                        {personalAlerts.length > 0 && (
                                <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground">Personal Alerts</h4>
                                <ul className="space-y-2">
                                    {personalAlerts.map(({ type, date, details, variant }, index) => (
                                        <li key={index}>
                                                <div className={`block p-3 rounded-md border ${variant === 'destructive' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'}`}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className={`h-5 w-5 ${variant === 'destructive' ? 'text-red-500' : 'text-amber-500'} mt-0.5`} />
                                                        <div>
                                                            <p className="font-semibold">{type}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {details}{date && ` on ${format(parseISO(date), 'MMM d, yyyy')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {discussionRequests.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground">Safety Discussion Responses</h4>
                                <ul className="space-y-2">
                                    {discussionRequests.map(({ report, entry }) => (
                                        <li key={entry.id}>
                                            <Link href={`/safety/${report.id}`} className="block p-3 rounded-md border hover:bg-muted/50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <MessageSquareWarning className="h-5 w-5 text-yellow-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold">Reply to {entry.author}</p>
                                                            <p className="text-sm text-muted-foreground truncate max-w-48">"{entry.message}"</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <Badge variant="outline" className="mt-2">{report.reportNumber}</Badge>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {riskReviews.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-muted-foreground">Risk Reviews Due</h4>
                                <ul className="space-y-2">
                                    {riskReviews.map(risk => (
                                            <li key={risk.id}>
                                                <Link href={`/safety?tab=register&risk=${risk.id}`} className="block p-3 rounded-md border hover:bg-muted/50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold">{risk.hazard}</p>
                                                            <p className="text-sm text-muted-foreground">Review due by: {format(parseISO(risk.reviewDate!), 'MMM d, yyyy')}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </Link>
                                            </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground text-center">No outstanding alerts or tasks.</p>
                    </div>
                )}
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
                {(user.role === 'Student' || user.role.includes('Instructor')) && (
                    <FatigueRiskIndicatorCard
                        userRole={user.role}
                        trainingLogs={userLogs}
                    />
                )}
                
                <Card>
                <CardHeader>
                    <CardTitle>
                    My Roster
                    </CardTitle>
                    <CardDescription>Select a date to view your schedule. Dates with bookings are highlighted.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="flex justify-center">
                        <Calendar
                            mode="single"
                            selected={selectedDay}
                            onSelect={setSelectedDay}
                            className="rounded-md border"
                            defaultMonth={today}
                            modifiers={{ booked: bookedDays }}
                            modifiersClassNames={{
                                booked: 'bg-accent/50 text-accent-foreground rounded-full',
                            }}
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-6 w-6"/>
                            <h3 className="text-xl font-semibold">
                                {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'No date selected'}
                            </h3>
                        </div>
                    {selectedDayBookings.length > 0 ? (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Aircraft</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedDayBookings.map(booking => {
                            const relatedAircraft = companyAircraft.find(a => a.tailNumber === booking.aircraft);
                            const preFlightChecklist = relatedAircraft ? companyChecklists.find(c => c.category === 'Pre-Flight' && c.aircraftId === relatedAircraft.id) : undefined;
                            return (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                                    <TableCell className="font-medium">{booking.aircraft}</TableCell>
                                    <TableCell>{user.role === 'Instructor' ? booking.student : booking.instructor}</TableCell>
                                    <TableCell>
                                    <Badge variant={getPurposeVariant(booking.purpose)}>{booking.purpose}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {booking.purpose === 'Training' && booking.status === 'Approved' && preFlightChecklist && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <ClipboardCheck className="mr-2 h-4 w-4" />
                                                        Checklist
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
                                                    <ChecklistCard 
                                                        checklist={preFlightChecklist} 
                                                        aircraft={relatedAircraft}
                                                        onItemToggle={handleItemToggle}
                                                        onUpdate={handleChecklistUpdate}
                                                        onReset={handleReset}
                                                        onEdit={() => {}}
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                            })}
                        </TableBody>
                        </Table>
                    ) : (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                                {selectedDay ? "No bookings or leave scheduled for this day." : "Select a day to see your schedule."}
                            </p>
                        </div>
                    )}
                    </div>
                </CardContent>
                </Card>
            </div>
            <div className="xl:col-span-1">
                {/* This space is now empty since the action items card was moved up */}
            </div>
        </div>
      </main>
    </div>
  );
}
