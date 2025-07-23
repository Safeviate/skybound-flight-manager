
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { addCompany, addUser } from '@/lib/data-provider';

export default function CorporatePage() {
    const { toast } = useToast();

    const handleNewCompany = (newCompanyData: Omit<Company, 'id'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string) => {
        const newCompanyId = newCompanyData.name.toLowerCase().replace(/\s+/g, '-');
        
        const newCompany: Company = {
            ...newCompanyData,
            id: newCompanyId,
        };

        const newAdminUser: User = {
            ...adminData,
            id: `user-${Date.now()}`,
            companyId: newCompanyId,
            role: 'Admin',
            permissions: ROLE_PERMISSIONS['Admin'],
            password: password,
        };
        
        addCompany(newCompany);
        addUser(newAdminUser);

        toast({
            title: "Company Registered!",
            description: `The company "${newCompany.name}" has been created. You can now log in with the admin user.`
        });
    };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <div className="absolute top-8 left-8 flex items-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold">Safeviate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Modern Aviation Management</h1>
                <p className="text-muted-foreground">
                    Welcome to Safeviate, the all-in-one platform for flight school operations, safety, and compliance. Register your organization or log in to continue.
                </p>
                <Button asChild>
                    <Link href="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Login to Your Account
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Register a New Company</CardTitle>
                    <CardDescription>
                        Set up a new portal for your organization. This will also create the first administrator account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <NewCompanyForm onSubmit={handleNewCompany} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
