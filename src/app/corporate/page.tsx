
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { addCompany as addMockCompany, addUser as addMockUser } from '@/lib/data-provider';
import config from '@/config';


export default function CorporatePage() {
    const { toast } = useToast();

    const handleNewCompany = async (newCompanyData: Omit<Company, 'id'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string) => {
        const companyId = newCompanyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        if (config.useMockData) {
            const newCompany: Company = { ...newCompanyData, id: companyId };
            const newAdminUser: User = { ...adminData, id: `user-${Date.now()}`, companyId, role: 'Admin', permissions: ROLE_PERMISSIONS['Admin'], password: password };
            addMockCompany(newCompany);
            addMockUser(newAdminUser);
            toast({ title: "Company Registered (Mock)!", description: `The company "${newCompany.name}" has been created in the mock data.` });
            return;
        }

        // --- Real Firestore Logic ---
        try {
            // 1. Create the user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
            const newUserId = userCredential.user.uid;

            // 2. Create the company document in Firestore
            const companyDocRef = doc(db, 'companies', companyId);
            await setDoc(companyDocRef, { ...newCompanyData, id: companyId });

            // 3. Create the user document in the users subcollection for that company
            const userDocRef = doc(db, `companies/${companyId}/users`, newUserId);
            const finalUserData: Omit<User, 'password'> = {
                ...adminData,
                id: newUserId,
                companyId: companyId,
                role: 'Admin',
                permissions: ROLE_PERMISSIONS['Admin'],
            };
            await setDoc(userDocRef, finalUserData);

            toast({
                title: "Company Registered Successfully!",
                description: `The company "${newCompany.name}" has been created. You can now log in.`
            });

        } catch (error: any) {
            console.error("Error creating company:", error);
            const errorCode = error.code;
            let errorMessage = "An unknown error occurred.";
            if (errorCode === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use by another account.";
            } else if (errorCode === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please use at least 6 characters.";
            }
            toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: errorMessage,
            });
        }
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
