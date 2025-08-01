
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPersonnelForm } from './edit-personnel-form';
import { useSettings } from '@/context/settings-provider';


function PersonnelPage() {
    const { user, company, loading } = useUser();
    const { settings } = useSettings();
    const router = useRouter();
    const [personnel, setPersonnel] = useState<PersonnelUser[]>([]);
    const [isNewPersonnelOpen, setIsNewPersonnelOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<PersonnelUser | null>(null);
    const { toast } = useToast();
    
    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');

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
    
    const handleUpdatePersonnel = async (updatedData: PersonnelUser) => {
        if (!company) return;
        
        try {
            const userRef = doc(db, `companies/${company.id}/users`, updatedData.id);
            const permissions = ROLE_PERMISSIONS[updatedData.role] || [];
            await updateDoc(userRef, { ...updatedData, permissions });
            setPersonnel(prev => prev.map(p => p.id === updatedData.id ? { ...updatedData, permissions } : p));
            setEditingPersonnel(null);
            toast({ title: 'Personnel Updated', description: `${updatedData.name}'s details have been saved.` });
        } catch (error) {
            console.error('Failed to update personnel:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update personnel details.' });
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
                {canEdit && (
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
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Required Documents</TableHead>
                             {canEdit && <TableHead className="text-right">Actions</TableHead>}
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
                                    {person.requiredDocuments && person.requiredDocuments.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {person.requiredDocuments.map(doc => (
                                                <Badge key={doc} variant="secondary" className="font-normal">
                                                    {doc}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        'N/A'
                                    )}
                                </TableCell>
                                {canEdit && (
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setEditingPersonnel(person)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        {editingPersonnel && (
            <Dialog open={!!editingPersonnel} onOpenChange={() => setEditingPersonnel(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Personnel: {editingPersonnel.name}</DialogTitle>
                        <DialogDescription>
                            Update the details for this staff member.
                        </DialogDescription>
                    </DialogHeader>
                    <EditPersonnelForm 
                        personnel={editingPersonnel} 
                        onSubmit={handleUpdatePersonnel} 
                    />
                </DialogContent>
            </Dialog>
        )}
      </main>
  );
}

PersonnelPage.title = 'Personnel Management';
export default PersonnelPage;

    