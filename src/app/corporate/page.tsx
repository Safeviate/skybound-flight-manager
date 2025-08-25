
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';


export default function CorporatePage() {
    const { toast } = useToast();
    const router = useRouter();

    const handleNewCompany = async (companyData: Omit<Company, 'id' | 'trademark'>, logoFile?: File) => {
        
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
            const companyDocRef = doc(db, 'companies', companyId);
            const finalCompanyData: Company = {
                id: companyId,
                logoUrl: logoUrl,
                trademark: `Your Trusted Partner in Aviation`,
                ...companyData,
            };
            await setDoc(companyDocRef, finalCompanyData);

            toast({
                title: "Company Created!",
                description: `The company portal for ${companyData.name} is ready. You can now switch to it from the settings menu to add users.`
            });

            router.push('/login');

        } catch (error: any) {
            console.error("Error creating company:", error);
            toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: "An error occurred while creating the company.",
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
                        Set up a new company portal. You can add users after creation.
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
