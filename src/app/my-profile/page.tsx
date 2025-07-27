
'use client';

import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Mail, Phone, Shield } from 'lucide-react';

function MyProfilePage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }
    
    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

    return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card className="max-w-xl mx-auto">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>View your personal information and settings.</CardDescription>
                </div>
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button>View My Information</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Personal Information</DialogTitle>
                            <DialogDescription>
                                Your details as they appear in the system.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center space-x-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src="/placeholder-user.jpg" />
                                    <AvatarFallback>{userInitial}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h2 className="text-xl font-semibold">{user.name}</h2>
                                    <p className="text-muted-foreground">{user.role}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{user.email || 'No email on file'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{user.phone || 'No phone on file'}</span>
                                </div>
                                 <div className="flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{user.department || 'No department assigned'}</span>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
        </Card>
      </main>
  );
}

MyProfilePage.title = 'My Profile';
export default MyProfilePage;
