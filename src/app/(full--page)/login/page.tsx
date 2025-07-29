
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
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import type { User } from '@/lib/types';

export default function LoginPage() {
  const { user, login, company } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [selectedDemoUser, setSelectedDemoUser] = useState<string>('');


  useEffect(() => {
    // If a user is already logged in, redirect them away from the login page.
    if (user) {
        router.push('/');
    }
  }, [user, router]);
  
  useEffect(() => {
    const fetchDemoUsers = async () => {
        try {
            const usersQuery = query(collectionGroup(db, 'users'));
            const snapshot = await getDocs(usersQuery);
            const usersList = snapshot.docs.map(doc => doc.data() as User);
            setDemoUsers(usersList);
        } catch (error) {
            console.error("Failed to fetch demo users:", error);
            setLoginError("Could not load demo users from the database.");
        }
    };
    fetchDemoUsers();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);
    
    const loginSuccess = await login(email, password);

    if (loginSuccess) {
        const redirectPath = searchParams.get('redirect');
        router.push(redirectPath || '/');
    } else {
      setLoginError('Login failed. Please check your email and password.');
      setIsLoading(false);
    }
  }
  
  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDemoUser) {
        setLoginError("Please select a demo user to log in.");
        return;
    }
    setIsDemoLoading(true);
    setLoginError(null);

    const loginSuccess = await login(selectedDemoUser);
    
    if (loginSuccess) {
        const redirectPath = searchParams.get('redirect');
        router.push(redirectPath || '/');
    } else {
        setLoginError('Demo login failed. The selected user could not be found.');
        setIsDemoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'SkyBound Flight Manager'}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card>
            <CardHeader>
            <CardTitle className="text-2xl">
                Login to Your Account
            </CardTitle>
            <CardDescription>
                Enter your email and password below to login.
            </CardDescription>
            </CardHeader>
            <CardContent>
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
                <Label htmlFor="password">Password</Label>
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

        <Card>
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2"><Users /> Demo Login</CardTitle>
                <CardDescription>Select a sample user to log in without a password.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleDemoLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="demo-user-select">Select a User</Label>
                        <Select value={selectedDemoUser} onValueChange={setSelectedDemoUser}>
                            <SelectTrigger id="demo-user-select">
                                <SelectValue placeholder="Select a demo user role..." />
                            </SelectTrigger>
                            <SelectContent>
                                {demoUsers.map(demoUser => (
                                    <SelectItem key={demoUser.id} value={demoUser.email || demoUser.id}>
                                        {demoUser.name} ({demoUser.role} @ {demoUser.companyId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <Button type="submit" variant="secondary" className="w-full" disabled={isDemoLoading}>
                        {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                        Login as Demo User
                    </Button>
                </form>
            </CardContent>
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
