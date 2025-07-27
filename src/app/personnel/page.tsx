'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { sendEmail } from '@/ai/flows/send-email-flow';

function PersonnelPage() {
    const { user, company, loading } = useUser();
    const router = useRouter();
    const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);
    const [isNewPersonnelOpen, setIsNewPersonnelOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (company) {
            fetchPersonnel();
        }
    }, [user, company, loading, router]);
    
    const fetchPersonnel = async () => {
        if (!company) return;
        const personnelQuery = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
        const snapshot = await getDocs(personnelQuery);
        setPersonnel(snapshot.docs.map(doc => doc.data() as PersonnelUser));
    };

    const handleNewPersonnel = async (data: Omit<PersonnelUser, 'id'>) => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
            return;
        }

        const newUserId = doc(collection(db, 'temp')).id;
        const permissions = ROLE_PERMISSIONS[data.role] || [];
        const temporaryPassword = Math.random().toString(36).slice(-8);

        const newPersonnel: PersonnelUser = {
            ...data,
            id: newUserId,
            companyId: company.id,
            status: 'Active',
            permissions,
        };

        try {
            await setDoc(doc(db, `companies/${company.id}/users`, newUserId), newPersonnel);

            // Send welcome email
            if (data.email) {
                await sendEmail({
                    to: data.email,
                    subject: `Welcome to ${company.name}`,
                    emailData: {
                        userName: data.name,
                        companyName: company.name,
                        userEmail: data.email,
                        temporaryPassword: temporaryPassword,
                        loginUrl: window.location.origin + '/login',
                    },
                });
            }
            
            setPersonnel(prev => [...prev, newPersonnel]);
            setIsNewPersonnelOpen(false);
            toast({
                title: 'Personnel Added',
                description: `${data.name} has been added and a welcome email has been sent.`,
            });
        } catch (error) {
            console.error("Error adding new personnel:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add new personnel.' });
        }
    };


  if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Personnel Roster</CardTitle>
                    <CardDescription>A list of all active staff members.</CardDescription>
                </div>
                <Dialog open={isNewPersonnelOpen} onOpenChange={setIsNewPersonnelOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            New Personnel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New Personnel</DialogTitle>
                            <DialogDescription>
                                Add a new staff member to the system. This will create their user account and send them a welcome email.
                            </DialogDescription>
                        </DialogHeader>
                        <NewPersonnelForm onSubmit={handleNewPersonnel} />
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Medical Expiry</TableHead>
                            <TableHead>License Expiry</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {personnel.map(person => (
                            <TableRow key={person.id}>
                                <TableCell className="font-medium">{person.name}</TableCell>
                                <TableCell>{person.role}</TableCell>
                                <TableCell>
                                    <div>{person.email}</div>
                                    <div>{person.phone}</div>
                                </TableCell>
                                <TableCell>
                                    {person.medicalExpiry ? getExpiryBadge(person.medicalExpiry) : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    {person.licenseExpiry ? getExpiryBadge(person.licenseExpiry) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </main>
  );
}

PersonnelPage.title = 'Personnel Management';
export default PersonnelPage;
