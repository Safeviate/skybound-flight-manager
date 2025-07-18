
'use client';

import { useUser } from '@/context/user-provider';
import { userData } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser } from '@/lib/types';
import { Rocket } from 'lucide-react';

export default function LoginPage() {
  const { login } = useUser();
  const router = useRouter();

  const handleLogin = (userId: string) => {
    login(userId);
    router.push('/');
  };
  
  const getRoleVariant = (role: AppUser['role']) => {
    switch (role) {
        case 'Instructor': return 'primary'
        case 'Maintenance': return 'destructive'
        case 'Admin': return 'secondary'
        case 'Student': return 'default'
        default: return 'outline'
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2">
         <Rocket className="h-8 w-8 text-primary" />
         <span className="text-xl font-semibold">SkyBound</span>
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Select a User Role</CardTitle>
          <CardDescription>
            Choose a user to simulate logging in. This will adjust the application's UI and permissions based on the selected user's role.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userData.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-md border p-4"
            >
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={`https://placehold.co/40x40.png`} alt={user.name} data-ai-hint="user avatar" />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                </div>
              </div>
              <Button onClick={() => handleLogin(user.id)} size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Log In As
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
