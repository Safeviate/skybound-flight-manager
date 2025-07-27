
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, CheckSquare, AlertTriangle, ChevronRight, Check, ListChecks, Calendar } from 'lucide-react';
import type { User as AppUser, Alert, QualityAudit, Booking, Role } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonalInformationCard } from './personal-information-card';
import { FatigueRiskIndicatorCard } from './fatigue-risk-indicator-card';
import Link from 'next/link';

function ChangePasswordDialog({ user, onPasswordChanged }: { user: AppUser, onPasswordChanged: (newPassword: string) => void }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        onPasswordChanged(newPassword);
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
        });
    }

    return (
        <Dialog defaultOpen>
            <DialogContent onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><KeyRound/> Change Your Password</DialogTitle>
                    <DialogDescription>
                        For your security, you must change the temporary password before proceeding.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input 
                            id="new-password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input 
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <Button onClick={handleSubmit}>Set New Password</Button>
            </DialogContent>
        </Dialog>
    )
}

function MyProfilePage() {
    const { user, updateUser, company, loading, getUnacknowledgedAlerts, acknowledgeAlerts } = useUser();
    const router = useRouter();
    const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
    const [auditsForSignature, setAuditsForSignature] = useState<QualityAudit[]>([]);
    const [upcomingAudits, setUpcomingAudits] = useState<QualityAudit[]>([]);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        // Data fetching logic will be added here in the next step
    }, [user, company, loading, router]);
    
    const allActionItems = useMemo(() => {
        if (!user) return [];

        const personalAlerts: { id: string, type: string; date?: string; details: string; variant: 'warning' | 'destructive'; relatedLink?: string; icon: React.ReactNode }[] = [];

        // 1. Document Expiry Alerts
        if (user.medicalExpiry) {
            const daysUntil = differenceInDays(parseISO(user.medicalExpiry), new Date());
            if (daysUntil <= 60) {
                personalAlerts.push({ 
                    id: `personal-medical-${user.id}`,
                    type: 'Medical Certificate Expiry', 
                    date: user.medicalExpiry, 
                    details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                    variant: daysUntil > 30 ? 'warning' : 'destructive',
                    icon: <AlertTriangle className={`h-5 w-5 ${daysUntil > 30 ? 'text-amber-500' : 'text-red-500'}`} />
                });
            }
        }
        if (user.licenseExpiry) {
            const daysUntil = differenceInDays(parseISO(user.licenseExpiry), new Date());
            if (daysUntil <= 60) {
                personalAlerts.push({ 
                    id: `personal-license-${user.id}`,
                    type: 'Pilot License Expiry', 
                    date: user.licenseExpiry, 
                    details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                    variant: daysUntil > 30 ? 'warning' : 'destructive',
                    icon: <AlertTriangle className={`h-5 w-5 ${daysUntil > 30 ? 'text-amber-500' : 'text-red-500'}`} />
                });
            }
        }
        
        // 2. Unacknowledged System Alerts & Tasks
        const taskAlerts = getUnacknowledgedAlerts([]) // Passing empty array for now
            .map(alert => ({
                id: alert.id,
                type: alert.title,
                details: alert.description,
                relatedLink: alert.relatedLink,
                variant: 'warning' as const,
                icon: <CheckSquare className="h-5 w-5 text-blue-500 mt-0.5" />,
            }));

        // 3. Upcoming Bookings
        const bookingItems = upcomingBookings.map(booking => ({
            id: `booking-${booking.id}`,
            type: 'Upcoming Booking',
            details: `${booking.purpose} - ${booking.aircraft} at ${booking.startTime}`,
            date: booking.date,
            relatedLink: '/bookings',
            variant: 'warning' as const,
            icon: <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />,
        }));
        
        // 4. Upcoming Audits
        const upcomingAuditItems = upcomingAudits.map(audit => ({
            id: `upcoming-audit-${audit.id}`,
            type: 'Upcoming Audit',
            details: audit.title,
            date: audit.date,
            relatedLink: `/quality/${audit.id}`,
            variant: 'warning' as const,
            icon: <ListChecks className="h-5 w-5 text-blue-500 mt-0.5" />,
        }));

        return [...personalAlerts, ...taskAlerts, ...bookingItems, ...upcomingAuditItems];
    }, [user, getUnacknowledgedAlerts, upcomingBookings, upcomingAudits]);

    const handleAcknowledge = (alertId: string) => {
        acknowledgeAlerts([alertId]);
    };
    
    if (loading || !user) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        )
    }

    const handlePasswordChanged = (newPassword: string) => {
        if (user) {
            const updatedUser = {
                ...user,
                password: newPassword,
                mustChangePassword: false,
            };
            updateUser(updatedUser);
        }
    };
    
    const totalTasks = allActionItems.length;

    const pilotRoles: Role[] = ['Student', 'Instructor', 'Chief Flight Instructor', 'Head Of Training'];
    const showFatigueCard = pilotRoles.includes(user.role);

  return (
    <>
      {user.mustChangePassword && (
        <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged} />
      )}
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PersonalInformationCard user={user} onUpdate={() => {}}/>
                    </CardContent>
                </Card>

                {showFatigueCard && (
                    <FatigueRiskIndicatorCard userRole={user.role} trainingLogs={user.trainingLogs || []}/>
                )}
            </div>
            <div className="xl:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>My Action Items ({totalTasks})</CardTitle>
                        <CardDescription>Alerts and tasks assigned to you that require your attention.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {totalTasks > 0 ? (
                           <ul className="space-y-2">
                                {allActionItems.map(({ id, type, details, variant, relatedLink, icon, date }) => (
                                    <li key={id} className="flex items-center gap-2">
                                        <div className="flex-1">
                                            {relatedLink ? (
                                                <Link href={relatedLink} className="block hover:opacity-80">
                                                    <div className="flex items-start p-3 rounded-md border"
                                                        style={{
                                                            borderColor: variant === 'destructive' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))',
                                                            backgroundColor: variant === 'destructive' ? 'hsl(var(--destructive), 0.1)' : 'hsl(var(--warning), 0.1)',
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-3 flex-1">
                                                            {icon}
                                                            <div className="flex-1">
                                                                <p className="font-semibold">{type}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {details}{date && ` on ${format(parseISO(date), 'MMM d, yyyy')}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="p-1 -mr-2">
                                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <div className="flex items-start p-3 rounded-md border"
                                                    style={{
                                                        borderColor: variant === 'destructive' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))',
                                                        backgroundColor: variant === 'destructive' ? 'hsl(var(--destructive), 0.1)' : 'hsl(var(--warning), 0.1)',
                                                    }}
                                                >
                                                    <div className="flex items-start gap-3 flex-1">
                                                        {icon}
                                                        <div className="flex-1">
                                                            <p className="font-semibold">{type}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {details}{date && ` on ${format(parseISO(date), 'MMM d, yyyy')}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {id.startsWith('personal-') === false && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handleAcknowledge(id)}
                                            >
                                                <Check className="mr-2 h-4 w-4" />
                                                Acknowledge
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground text-center">No outstanding alerts or tasks.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </>
  );
}

MyProfilePage.title = "My Profile"
export default MyProfilePage;
