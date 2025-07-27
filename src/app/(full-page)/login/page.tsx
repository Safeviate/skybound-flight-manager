
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket, Loader2, User as UserIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, collectionGroup } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function LoginPage() {
  const { login, company } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingInUser, setLoggingInUser] = useState<string | null>(null);


  useEffect(() => {
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            // Use a collection group query to fetch all users more efficiently
            const usersQuery = query(collectionGroup(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const users = usersSnapshot.docs.map(doc => doc.data() as User);
            setAllUsers(users);
        } catch (error) {
            console.error("Error fetching users for login:", error);
            setLoginError("Could not load user profiles. Please check your connection.");
        } finally {
            setIsLoading(false);
        }
    }
    fetchUsers();
  }, []);

  async function handleUserSelect(user: User) {
    if (!user.email) {
        setLoginError(`User ${user.name} does not have an email and cannot be logged into.`);
        return;
    }
    setLoggingInUser(user.id);
    setLoginError(null);
    const loginSuccess = await login(user.email);

    if (loginSuccess) {
        const redirectPath = searchParams.get('redirect');
        router.push(redirectPath || '/my-profile');
    } else {
      setLoginError('Login failed. Please try again.');
      setLoggingInUser(null);
    }
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Rocket className="h-8 w-8 text-primary" />
        <span className="text-xl font-semibold">{company?.name || 'SkyBound Flight Manager'}</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            Select a User to Login
          </CardTitle>
          <CardDescription>
            This is a passwordless login for development and demonstration.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="flex items-center justify-center h-40">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                    <p>Loading user profiles...</p>
                 </div>
            ) : loginError ? (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{loginError}</AlertDescription>
                </Alert>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {allUsers.map(user => (
                        <Button 
                            key={user.id} 
                            variant="outline" 
                            className="w-full justify-start h-14"
                            onClick={() => handleUserSelect(user)}
                            disabled={!!loggingInUser}
                        >
                            {loggingInUser === user.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Avatar className="mr-4">
                                    <AvatarImage src={`https://placehold.co/40x40.png`} alt={user.name} data-ai-hint="user avatar" />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="text-left">
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.role} - {user.email || 'No email'}</p>
                            </div>
                        </Button>
                    ))}
                </div>
            )}
        </CardContent>
        <CardFooter className="justify-center text-sm">
            <Link href="/corporate" className="text-muted-foreground hover:text-primary">
                Don't have an account? Register your company
            </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
