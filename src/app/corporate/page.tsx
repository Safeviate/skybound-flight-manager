
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NewCompanyForm } from './new-company-form';
import type { Company, User, FindingOption } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { setDoc, doc, writeBatch, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { useUser } from '@/context/user-provider';


export default function CorporatePage() {
    const { toast } = useToast();
    const router = useRouter();
    const { setUserCompanies } = useUser();

    const handleNewCompany = async (companyData: Omit<Company, 'id'>, logoFile?: File) => {
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

            // 1. Create Company Document
            const companyDocRef = doc(db, 'companies', companyId);
            
            const defaultTheme = {
                primary: '#0d6efd',
                background: '#f8f9fa',
                card: '#ffffff',
                accent: '#ffc107',
                foreground: '#212529',
                headerForeground: '#212529',
                cardForeground: '#212529',
                sidebarBackground: '#0c0a09',
                sidebarForeground: '#f8f9fa',
                sidebarAccent: '#1f2937',
                font: 'var(--font-inter)',
            };

            const defaultFindingOptions: FindingOption[] = [
                { id: '1', name: 'Compliant' },
                { id: '2', name: 'Non Compliant' },
                { id: '3', name: 'Partial' },
                { id: '4', name: 'Observation' },
                { id: '5', name: 'Not Applicable' },
            ];

            const finalCompanyData: Company = {
                id: companyId,
                ...companyData,
                logoUrl: logoUrl,
                theme: {
                    ...defaultTheme,
                    ...companyData.theme, 
                },
                findingOptions: defaultFindingOptions,
            };
            batch.set(companyDocRef, finalCompanyData);

             // 2. Seed default roles and departments
            const defaultRoles = [
                { name: 'Accountable Manager' },
                { name: 'Safety Manager' },
                { name: 'Quality Manager' },
                { name: 'Head of Training' },
                { name: 'Chief Flight Instructor' },
                { name: 'Instructor' },
                { name: 'Student' },
                { name: 'Admin' },
            ];
            const defaultDepts = [
                { name: 'Management' },
                { name: 'Flight Operations' },
                { name: 'Safety' },
                { name: 'Quality' },
                { name: 'Administration' },
            ];
            
            const rolesCollectionRef = collection(db, `companies/${companyId}/roles`);
            defaultRoles.forEach(role => {
                const roleDocRef = doc(rolesCollectionRef);
                batch.set(roleDocRef, role);
            });

            const deptsCollectionRef = collection(db, `companies/${companyId}/departments`);
            defaultDepts.forEach(dept => {
                const deptDocRef = doc(deptsCollectionRef);
                batch.set(deptDocRef, dept);
            });
            
            await batch.commit();
            
            // 3. Update the user context with the new company
            setUserCompanies(prev => [...prev, finalCompanyData]);

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
            } else if (error.code === 'permission-denied' || error.code === 'not-found') {
                 errorMessage = "Permission denied or resource not found. Check your Firestore security rules to allow unauthenticated company creation.";
            }
            toast({
                variant: 'destructive',
                title: "Registration Failed",
                description: errorMessage,
            });
        }
    };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
        <div className="absolute top-8 left-8 flex items-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold">Safeviate</span>
        </div>
        <div className="absolute top-8 right-8">
            <Button asChild variant="outline">
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login to Your Account
                </Link>
            </Button>
        </div>
        
        <div className="w-full max-w-4xl space-y-8">
            <Card className="w-full">
                <CardContent className="p-6 md:p-8">
                    <NewCompanyForm onSubmit={handleNewCompany} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
