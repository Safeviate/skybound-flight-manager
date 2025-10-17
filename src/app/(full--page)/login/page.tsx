
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket, Loader2, KeyRound, Phone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail, updatePassword, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
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
  
  // Setup recaptcha
  useEffect(() => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  }, []);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    const loginSuccess = await login(email, password);

    if (!loginSuccess) {
      setLoginError('Login failed. Please check your email and password.');
      setIsLoading(false);
    }
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    try {
      const verifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setShowOtpInput(true);
      toast({ title: "Verification Code Sent", description: "A code has been sent to your phone." });
    } catch (error) {
      console.error(error);
      setLoginError('Failed to send verification code. Please check the phone number.');
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationResult) return;
    setIsLoading(true);
    setLoginError(null);

    try {
      await confirmationResult.confirm(otp);
      // User is signed in. The onAuthStateChanged listener will handle the rest.
    } catch (error) {
      console.error(error);
      setLoginError('Failed to verify code. It may be incorrect or expired.');
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
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
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
      <div id="recaptcha-container"></div>
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'Safeviate'}</span>
      </div>

      <div className="absolute top-1/2 left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
                Login
            </CardTitle>
            <CardDescription>
                Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="phone">Phone</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                    <form onSubmit={handleEmailLogin} className="space-y-4 pt-4">
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
                        Login with Email
                        </Button>
                    </form>
                </TabsContent>
                <TabsContent value="phone">
                     {!showOtpInput ? (
                        <form onSubmit={handlePhoneLogin} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <PhoneInput
                                    id="phone"
                                    international
                                    defaultCountry="ZA"
                                    value={phone}
                                    onChange={(value) => setPhone(value || '')}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !phone}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
                                Send Code
                            </Button>
                        </form>
                     ) : (
                        <form onSubmit={handleOtpVerify} className="space-y-4 pt-4">
                             <div className="space-y-2">
                                <Label htmlFor="otp">Verification Code</Label>
                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading || !otp}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                                Verify & Login
                            </Button>
                        </form>
                     )}
                </TabsContent>
            </Tabs>
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
      
      <Dialog open={isChangePasswordOpen} onOpenChange={() => {}}>
          <ChangePasswordDialog onPasswordChanged={onPasswordSuccessfullyChanged} />
      </Dialog>
    </>
  );
}
