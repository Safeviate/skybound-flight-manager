
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, LogIn, Rocket } from 'lucide-react';
import Link from 'next/link';

export default function AuthActionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!mode || !oobCode) {
      setError('Invalid request. Missing required parameters.');
      setIsLoading(false);
      return;
    }

    const handleAction = async () => {
      switch (mode) {
        case 'resetPassword':
          try {
            const userEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(userEmail);
            setError(null);
          } catch (e: any) {
            setError('The password reset link is invalid or has expired. Please try again.');
          }
          break;
        // Add cases for other modes like 'verifyEmail' if needed in the future
        default:
          setError('Unsupported action.');
      }
      setIsLoading(false);
    };

    handleAction();
  }, [mode, oobCode]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode || !newPassword) {
      setError('Please enter a new password.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (e: any) {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Verifying your request...</span>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (success) {
      return (
        <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-success mx-auto" />
            <h2 className="text-xl font-semibold">Password Changed!</h2>
            <p>Your password has been successfully updated.</p>
            <Button asChild>
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Return to Login
                </Link>
            </Button>
        </div>
      );
    }

    if (mode === 'resetPassword') {
      return (
        <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
          <p>Resetting password for <strong>{email}</strong>.</p>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      );
    }
    
    return null;
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
       <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">Safeviate</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Password Reset</CardTitle>
          <CardDescription>
            Please complete the action below to regain access to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
