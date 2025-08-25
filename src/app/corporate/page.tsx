
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { setDoc, doc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ROLE_PERMISSIONS } from '@/lib/types';


export default function CorporatePage() {
    const { toast } = useToast();
    const router = useRouter();

    const handleNewCompany = async (companyData: Omit<Company, 'id' | 'trademark'>, adminData: Omit<User, 'id' | 'companyId' | 'role' | 'permissions'>, password: string, logoFile?: File) => {
        const companyId = companyData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        
        let logoUrl = '';
        if (logoFile) {
            logoUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(logoFile);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
            });
        }

        try {
            const batch = writeBatch(db);

            // 1. Create Auth user for the admin
            const userCredential = await createUserWithEmailAndPassword(auth, adminData.email!, password);
            const newUserId = userCredential.user.uid;
            await updateProfile(userCredential.user, { displayName: adminData.name });

            // 2. Create Company Document with a predictable ID
            const companyDocRef = doc(db, 'companies', companyId);
            
            const defaultTheme = {
                primary: '#0d6efd',
                background: '#f8f9fa',
                card: '#ffffff',
                accent: '#ffc107',
                foreground: '#212529',
                headerForeground: '#212529', // Ensure this is present
                cardForeground: '#212529',
                sidebarBackground: '#0c0a09',
                sidebarForeground: '#f8f9fa',
                sidebarAccent: '#1f2937',
                font: 'var(--font-inter)',
            };

            const finalCompanyData: Company = {
                id: companyId,
                logoUrl: logoUrl,
                trademark: `Your Trusted Partner in Aviation`,
                ...companyData,
                theme: {
                    ...defaultTheme,
                    ...companyData.theme, // Merge with any theme data from the form
                }
            };
            batch.set(companyDocRef, finalCompanyData);
            
            // 3. Create Admin User Document
            const adminUserDocRef = doc(db, `companies/${companyId}/users`, newUserId);
            const finalAdminData: User = {
                id: newUserId,
                companyId: companyId,
                name: adminData.name,
                email: adminData.email,
                phone: adminData.phone,
                role: 'System Admin',
                permissions: ROLE_PERMISSIONS['System Admin'],
                status: 'Active',
            };
            batch.set(adminUserDocRef, finalAdminData);

            // 4. Commit batch
            await batch.commit();

            toast({
                title: "Company Created!",
                description: `The company portal for ${companyData.name} is ready. You can now log in.`
            });

            router.push('/login');

        } catch (error: any) {
            console.error("Error creating company:", error);
            let errorMessage = "An error occurred while creating the company.";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use by another account.";
            } else if (error.code === 'permission-denied') {
                 errorMessage = "Permission denied. Check your Firestore security rules to allow unauthenticated company creation.";
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
            <span className="text-xl font-semibold">SkyBound Flight Manager</span>
        </div>
        <div className="absolute top-8 right-8">
            <Button asChild variant="outline">
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Your Account
                </Link>
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl items-center">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Modern Aviation Management</h1>
                <p className="text-muted-foreground">
                    Welcome to SkyBound, the all-in-one platform for flight school operations, safety, and compliance. Register your company or log in to continue.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Register New Company</CardTitle>
                    <CardDescription>
                        Set up a new company portal and administrator account.
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
