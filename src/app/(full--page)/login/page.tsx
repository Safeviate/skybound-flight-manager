
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket, Loader2, Users, KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function ChangePasswordDialog({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError(null);
    setIsLoading(true);

    const user = auth.currentUser;
    if (user) {
      try {
        await updatePassword(user, newPassword);
        onPasswordChanged();
      } catch (e) {
        console.error(e);
        setError('Failed to update password. Please log out and try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Change Your Password</DialogTitle>
        <DialogDescription>
          For security, you must change your temporary password before you can continue.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button onClick={handleChangePassword} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set New Password
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


export default function LoginPage() {
  const { user, login, company, loading, updateUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    if (!loading && user) {
        if (user.mustChangePassword) {
            setIsChangePasswordOpen(true);
        } else {
            router.push('/my-dashboard');
        }
    }
  }, [user, loading, router]);
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    const loginSuccess = await login(email, password);

    if (!loginSuccess) {
      setLoginError('Login failed. Please check your email and password.');
      setIsLoading(false);
    }
  }
  
  const onPasswordSuccessfullyChanged = async () => {
    if (!user) return;
    await updateUser({ mustChangePassword: false });
    setIsChangePasswordOpen(false);
    toast({ title: "Password Updated!", description: "Your new password has been set." });
    router.push('/my-dashboard');
  }

  async function handlePasswordReset() {
    if (!email) {
      setLoginError('Please enter your email address to reset your password.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);
    try {
      // Correctly configure the action URL to point to your new page
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      toast({
        title: 'Password Reset Email Sent',
        description: `An email has been sent to ${email} with instructions to reset your password.`,
      });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
          setLoginError('No user found with this email address.');
      } else {
          setLoginError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <div className="relative min-h-screen bg-muted/40">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'Safeviate'}</span>
      </div>

      <div className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 px-4">
        <Card className="border-2 border-primary">
            <CardHeader>
            <CardTitle className="text-2xl">
                Login
            </CardTitle>
            <CardDescription>
                Enter your credentials to access your account.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                        <Button data-nosnippet type="button" variant="link" className="p-0 h-auto text-xs" onClick={handlePasswordReset}>
                        Forgot password?
                    </Button>
                    </div>
                <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Login
                </Button>
            </form>
            </CardContent>
            <CardFooter className="justify-center text-sm">
                <Link href="/corporate" className="text-muted-foreground hover:text-primary">
                    Don't have an account? Register your company
                </Link>
            </CardFooter>
        </Card>
        {loginError && (
            <Alert variant="destructive" className="border-destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
            </Alert>
        )}
      </div>
    </div>
    
    <Dialog open={isChangePasswordOpen} onOpenChange={() => {}}>
        <ChangePasswordDialog onPasswordChanged={onPasswordSuccessfullyChanged} />
    </Dialog>
    </>
  );
}
