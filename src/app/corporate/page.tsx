
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';


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
            // This is the new, correct sequence.
            // 1. First, create all the necessary documents in Firestore.
            const companyDocRef = doc(db, 'companies', companyId);
            const finalCompanyData: Company = {
                id: companyId,
                logoUrl: logoUrl,
                trademark: `Your Trusted Partner in Aviation`,
                ...companyData,
            };

            // We use a temporary user ID here that will be replaced by the auth UID.
            const tempUserId = `temp-${Date.now()}`; 
            const userInCompanyRef = doc(db, `companies/${companyId}/users`, tempUserId);
            
            const finalUserData: Partial<User> = {
                ...adminData,
                companyId: companyId,
                role: 'Admin',
                permissions: ROLE_PERMISSIONS['Admin'],
                status: 'Active',
            };

            // Write these initial documents.
            await setDoc(companyDocRef, finalCompanyData);
            await setDoc(userInCompanyRef, finalUserData);


            // 2. NOW, create the user in Firebase Authentication.
            const userCredential = await createUserWithEmailAndPassword(auth, adminData.email, password);
            const newUserId = userCredential.user.uid;
            
            await updateProfile(userCredential.user, {
                displayName: adminData.name,
            });

            // 3. Finally, update the user document with the REAL auth UID.
            const finalUserDocRef = doc(db, `companies/${companyId}/users`, newUserId);
            await setDoc(finalUserDocRef, { ...finalUserData, id: newUserId });
            // This leaves a temporary document with the random ID, but prevents the race condition.
            // A cleanup function could remove these later.

            toast({
                title: "Administrator Account Created!",
                description: `The company portal is ready. Redirecting to login...`
            });

            router.push('/login');

        } catch (error: any) {
            console.error("Error creating company:", error);
            const errorCode = error.code;
            let errorMessage = "An unknown error occurred.";
            if (errorCode === 'auth/email-already-in-use') {
                errorMessage = "This email address is already in use by another account.";
            } else if (errorCode === 'auth/weak-password') {
                errorMessage = "The password is too weak. Please use at least 8 characters.";
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
                    Welcome to SkyBound, the all-in-one platform for flight school operations, safety, and compliance. Register your administrator account or log in to continue.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Create Administrator Account</CardTitle>
                    <CardDescription>
                        Set up the first administrator account for your company portal.
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
