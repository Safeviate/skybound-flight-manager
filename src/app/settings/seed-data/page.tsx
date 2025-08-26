
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { Database, ShieldCheck } from 'lucide-react';
import { complianceData as seedComplianceData } from '@/lib/data-provider';

export default function SeedDataPage() {
    const { company } = useUser();
    const { toast } = useToast();

    const handleSeedRolesAndDepartments = async () => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'No active company found.' });
            return;
        }

        const batch = writeBatch(db);

        const defaultRoles = [
            { name: 'Accountable Manager', permissions: ROLE_PERMISSIONS['Accountable Manager'] },
            { name: 'Safety Manager', permissions: ROLE_PERMISSIONS['Safety Manager'] },
            { name: 'Quality Manager', permissions: ROLE_PERMISSIONS['Quality Manager'] },
            { name: 'Head of Training', permissions: ROLE_PERMISSIONS['Head Of Training'] },
            { name: 'Chief Flight Instructor', permissions: ROLE_PERMISSIONS['Chief Flight Instructor'] },
            { name: 'Instructor', permissions: ROLE_PERMISSIONS['Instructor'] },
            { name: 'Student', permissions: ROLE_PERMISSIONS['Student'] },
            { name: 'Admin', permissions: ROLE_PERMISSIONS['Admin'] },
        ];
        
        const defaultDepts = [
            { name: 'Management' },
            { name: 'Flight Operations' },
            { name: 'Safety' },
            { name: 'Quality' },
            { name: 'Administration' },
        ];

        const rolesCollectionRef = collection(db, `companies/${company.id}/roles`);
        defaultRoles.forEach(role => {
            const roleDocRef = doc(rolesCollectionRef);
            batch.set(roleDocRef, role);
        });

        const deptsCollectionRef = collection(db, `companies/${company.id}/departments`);
        defaultDepts.forEach(dept => {
            const deptDocRef = doc(deptsCollectionRef);
            batch.set(deptDocRef, dept);
        });

        try {
            await batch.commit();
            toast({
                title: 'Seeding Complete',
                description: 'Default roles and departments have been added to your company.',
            });
        } catch (error) {
            console.error("Error seeding data:", error);
            toast({
                variant: 'destructive',
                title: 'Seeding Failed',
                description: 'Could not seed default data. Check console for details.',
            });
        }
    };
    
    const handleSeedCoherenceMatrix = async () => {
        if (!company) return;
        const batch = writeBatch(db);
        const matrixCollectionRef = collection(db, `companies/${company.id}/compliance-matrix`);
        
        seedComplianceData.forEach(item => {
            const docRef = doc(matrixCollectionRef);
            const { findings, ...itemToSeed } = item;
            batch.set(docRef, {...itemToSeed, companyId: company.id});
        });
        
        try {
            await batch.commit();
            toast({title: 'Sample Data Seeded', description: 'The coherence matrix has been populated with Part 141 regulations.'})
        } catch (error) {
            console.error("Error seeding coherence matrix:", error);
            toast({ variant: 'destructive', title: 'Seeding Failed', description: 'Could not seed coherence matrix data.' });
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card className="max-w-xl mx-auto">
                <CardHeader>
                    <CardTitle>Seed Company Data</CardTitle>
                    <CardDescription>
                        Use these actions to populate your company with standard default data sets. This is useful for new companies or for restoring defaults.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Default Roles & Departments</h3>
                            <p className="text-sm text-muted-foreground">Adds a standard set of aviation roles and departments.</p>
                        </div>
                        <Button onClick={handleSeedRolesAndDepartments}>
                            <Database className="mr-2 h-4 w-4"/>
                            Seed Data
                        </Button>
                    </div>
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">Part 141 Coherence Matrix</h3>
                            <p className="text-sm text-muted-foreground">Populates the coherence matrix with standard Part 141 regulations.</p>
                        </div>
                         <Button onClick={handleSeedCoherenceMatrix}>
                            <ShieldCheck className="mr-2 h-4 w-4"/>
                            Seed Matrix
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

SeedDataPage.title = "Seed Data";
