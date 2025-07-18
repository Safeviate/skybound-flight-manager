import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { personnelData } from '@/lib/mock-data';
import { Mail, Phone, User, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Personnel } from '@/lib/types';

// In a real app, this would come from the logged-in user's session
const LOGGED_IN_PERSONNEL_ID = '1'; 

export default function MyProfilePage() {
    const user = personnelData.find(p => p.id === LOGGED_IN_PERSONNEL_ID);

    if (!user) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="My Profile" />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>User not found.</p>
                </main>
            </div>
        )
    }

    const getRoleVariant = (role: Personnel['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            default:
                return 'outline'
        }
    }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src="https://placehold.co/80x80" alt={user.name} data-ai-hint="user avatar" />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-3xl">{user.name}</CardTitle>
                        <CardDescription>
                            <Badge variant={getRoleVariant(user.role)} className="mt-1">{user.role}</Badge>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.name}</span>
                </div>
                 <div className="flex items-center space-x-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                     <span className="font-medium">{user.role}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{user.phone}</span>
                </div>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
