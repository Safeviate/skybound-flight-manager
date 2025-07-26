
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, CheckSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import type { User as AppUser, Alert } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PersonalInformationCard } from './personal-information-card';
import Link from 'next/link';
import { cn } from '@/lib/utils.tsx';

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
    const { user, updateUser, loading, getUnacknowledgedAlerts } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    const allActionItems = useMemo(() => {
        if (!user) return [];

        const today = new Date('2024-08-15');
        
        const personalAlerts: { type: string; date?: string; details: string; variant: 'warning' | 'destructive'; relatedLink?: string; icon: React.ReactNode }[] = [];

        if (user.medicalExpiry) {
            const daysUntil = differenceInDays(parseISO(user.medicalExpiry), today);
            if (daysUntil <= 60) {
                personalAlerts.push({ 
                    type: 'Medical Certificate Expiry', 
                    date: user.medicalExpiry, 
                    details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                    variant: daysUntil > 30 ? 'warning' : 'destructive',
                    icon: <AlertTriangle className={`h-5 w-5 ${daysUntil > 30 ? 'text-amber-500' : 'text-red-500'}`} />
                });
            }
        }
        if (user.licenseExpiry) {
            const daysUntil = differenceInDays(parseISO(user.licenseExpiry), today);
            if (daysUntil <= 60) {
                personalAlerts.push({ 
                    type: 'Pilot License Expiry', 
                    date: user.licenseExpiry, 
                    details: daysUntil > 0 ? `Expires in ${daysUntil} days` : 'Expired',
                    variant: daysUntil > 30 ? 'warning' : 'destructive',
                    icon: <AlertTriangle className={`h-5 w-5 ${daysUntil > 30 ? 'text-amber-500' : 'text-red-500'}`} />
                });
            }
        }
        
        const taskAlerts = getUnacknowledgedAlerts()
            .filter(alert => alert.type === 'Task')
            .map(alert => ({
                type: alert.title,
                details: alert.description,
                relatedLink: alert.relatedLink,
                variant: 'warning' as const,
                icon: <CheckSquare className="h-5 w-5 text-blue-500 mt-0.5" />
            }));

        return [...personalAlerts, ...taskAlerts];
    }, [user, getUnacknowledgedAlerts]);
    
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

  return (
    <>
      {user.mustChangePassword && (
        <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged} />
      )}
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-1 space-y-8">
                <PersonalInformationCard user={user} onUpdate={() => {}}/>
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
                                {allActionItems.map(({ type, details, variant, relatedLink, icon, date }, index) => (
                                    <li key={`action-item-${index}`}>
                                        <Link 
                                            href={relatedLink || '#'}
                                            className={cn(
                                                'flex items-start justify-between p-3 rounded-md border',
                                                variant === 'destructive' ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
                                                relatedLink ? 'hover:bg-muted/50' : 'pointer-events-none'
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                {icon}
                                                <div className="flex-1">
                                                    <p className="font-semibold">{type}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {details}{date && ` on ${format(parseISO(date), 'MMM d, yyyy')}`}
                                                    </p>
                                                </div>
                                            </div>
                                            {relatedLink && (
                                                <div className="p-1 -mr-2">
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </Link>
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
