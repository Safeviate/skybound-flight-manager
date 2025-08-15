
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket, Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function LoginPage() {
  const { user, login, company, loading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    // Redirect logged-in users
    if (!loading && user) {
        router.push('/my-dashboard');
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
    // The useEffect hook will handle redirection on successful login
  }

  async function handlePasswordReset() {
    if (!email) {
      setLoginError('Please enter your email address to reset your password.');
      return;
    }
    setIsLoading(true);
    setLoginError(null);
    try {
      await sendPasswordResetEmail(auth, email);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'SkyBound Flight Manager'}</span>
      </div>

      <div className="w-full max-w-sm">
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
                     <Button type="button" variant="link" className="p-0 h-auto text-xs" onClick={handlePasswordReset}>
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
      </div>

       {loginError && (
            <Alert variant="destructive" className="mt-8 max-w-sm">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{loginError}</AlertDescription>
            </Alert>
        )}
    </div>
  );
}
