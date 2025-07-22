
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { userData, allAlerts, companyData } from '@/lib/data-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, Rocket, AlertTriangle, Info, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { User as AppUser, Role, Alert } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';


const getAlertVariant = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return 'destructive';
        case 'Yellow Tag': return 'warning';
        default: return 'outline';
    }
}

const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
        case 'Red Tag': return <AlertTriangle className="h-6 w-6 text-destructive" />;
        case 'Yellow Tag': return <Info className="h-6 w-6 text-yellow-600" />;
        default: return null;
    }
}


export default function LoginPage() {
  const { login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [alertsToShow, setAlertsToShow] = useState<Alert[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  // For this demo, we assume a single company ("skybound") on the login page.
  // In a real multi-tenant app, this might be determined by the URL (e.g., skybound.yourapp.com)
  const company = companyData.find(c => c.id === 'skybound');

  useEffect(() => {
    try {
        const acknowledgedIds = JSON.parse(sessionStorage.getItem('acknowledgedAlertIds') || '[]');
        const unacknowledged = allAlerts.filter(alert => !acknowledgedIds.includes(alert.id));
        setAlertsToShow(unacknowledged);
        if (unacknowledged.length === 0) {
            setAcknowledged(true);
        }
    } catch (e) {
        setAlertsToShow(allAlerts);
    }
  }, []);

  const handleAcknowledge = () => {
    try {
        const currentIds = JSON.parse(sessionStorage.getItem('acknowledgedAlertIds') || '[]');
        const newIds = alertsToShow.map(alert => alert.id);
        const allAcknowledgedIds = [...new Set([...currentIds, ...newIds])];
        sessionStorage.setItem('acknowledgedAlertIds', JSON.stringify(allAcknowledgedIds));
    } catch (e) {
        console.error("Could not write to sessionStorage");
    }
    setAcknowledged(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = userData.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (foundUser) {
        login(foundUser.id);
        const redirectPath = searchParams.get('redirect');
        if (redirectPath) {
            router.push(redirectPath);
        } else {
            router.push('/');
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'No user found with that email address.',
        });
    }
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
         <span className="text-xl font-semibold">{company?.name || 'SkyBound'}</span>
      </div>
      
      {!acknowledged ? (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="text-2xl">Active System Alerts</CardTitle>
                <CardDescription>
                    You must read and acknowledge the following alerts before logging in.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {alertsToShow.map((alert) => (
                    <Card key={alert.id}>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                {getAlertIcon(alert.type)}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={getAlertVariant(alert.type)}>{alert.type}</Badge>
                                        <CardTitle className="text-lg">#{alert.number} - {alert.title}</CardTitle>
                                    </div>
                                    <CardDescription className="mt-2">{alert.description}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">Issued by {alert.author} on {alert.date}</p>
                        </CardContent>
                    </Card>
                ))}
                 <Button onClick={handleAcknowledge} className="w-full mt-4">Acknowledge & Continue to Login</Button>
            </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
            <form onSubmit={handleLogin}>
                <CardHeader>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your credentials to sign in to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                    </Button>
                    <p className="text-xs text-muted-foreground text-center px-4">
                        For demo purposes, you can use any email from the mock user data (e.g., admin@skybound.com) and any password.
                    </p>
                </CardFooter>
            </form>
        </Card>
      )}
    </div>
  );
}
