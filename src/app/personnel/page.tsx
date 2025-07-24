
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { User, Role } from '@/lib/types';
import { PlusCircle, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PersonnelForm } from './personnel-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function PersonnelPage() {
    const { user, company, loading } = useUser();
    const [personnelList, setPersonnelList] = useState<User[]>([]);
    const [editingPersonnel, setEditingPersonnel] = useState<User | null>(null);
    const [isNewPersonnelDialogOpen, setIsNewPersonnelDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (company) {
            fetchPersonnel();
        }
    }, [user, company, loading, router]);
    
    const fetchPersonnel = async () => {
        if (!company) return;
        try {
            const personnelQuery = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
            const snapshot = await getDocs(personnelQuery);
            const fetchedPersonnel = snapshot.docs.map(doc => doc.data() as User);
            setPersonnelList(fetchedPersonnel);
        } catch (error) {
            console.error("Error fetching personnel:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch personnel data.' });
        }
    };
    
    const canEditPersonnel = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');

    const handleFormSubmit = async (personnelData: Omit<User, 'id'>) => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Company context is missing.' });
            return;
        }

        if (editingPersonnel) {
            // Update existing personnel
            try {
                const userRef = doc(db, `companies/${company.id}/users`, editingPersonnel.id);
                const { password, ...updateData } = personnelData; // Exclude password from update data for now
                await updateDoc(userRef, updateData);

                // Update local state
                setPersonnelList(prev => prev.map(p => p.id === editingPersonnel.id ? { ...p, ...updateData } : p));
                toast({ title: 'Personnel Updated', description: `${personnelData.name}'s information has been saved.` });
            } catch (error) {
                console.error("Error updating personnel:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to update personnel information.' });
            }
        } else {
            // Add new personnel
            let newUserId = doc(collection(db, 'temp')).id; // Generate a random ID for non-auth users
            
            try {
                if (personnelData.role === 'Admin') {
                    if (!personnelData.email || !personnelData.password) {
                        toast({ variant: 'destructive', title: 'Error', description: 'An email and password are required for new Admins.' });
                        return;
                    }
                    const userCredential = await createUserWithEmailAndPassword(auth, personnelData.email, personnelData.password);
                    newUserId = userCredential.user.uid;
                }

                const newUser: User = {
                    ...personnelData,
                    id: newUserId,
                    companyId: company.id,
                };
                delete newUser.password; // Do not store password in Firestore

                await setDoc(doc(db, `companies/${company.id}/users`, newUserId), newUser);
                setPersonnelList(prev => [...prev, newUser]);
                toast({ title: 'Personnel Added', description: `${personnelData.name} has been added to the roster.` });

            } catch (error: any) {
                console.error("Error creating new personnel:", error);
                let errorMessage = "Failed to create new personnel.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "This email is already in use.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "The password is too weak.";
                }
                toast({ variant: 'destructive', title: 'Creation Failed', description: errorMessage });
            }
        }
        setEditingPersonnel(null);
        setIsNewPersonnelDialogOpen(false);
    };
    
    const handleEditClick = (person: User) => {
        setEditingPersonnel(person);
        setIsNewPersonnelDialogOpen(true);
    }
    
    const handleDialogClose = (isOpen: boolean) => {
        if (!isOpen) {
            setEditingPersonnel(null);
        }
        setIsNewPersonnelDialogOpen(isOpen);
    }

    const getRoleVariant = (role: Role) => {
        switch (role) {
            case 'Instructor':
            case 'Chief Flight Instructor':
            case 'Head Of Training':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
            case 'Accountable Manager':
            case 'Safety Manager':
            case 'Quality Manager':
            case 'HR Manager':
            case 'Operations Manager':
                return 'secondary'
            default:
                return 'outline'
        }
    }

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
              <CardDescription>A list of all non-student personnel in the system.</CardDescription>
            </div>
            {canEditPersonnel && (
              <Dialog open={isNewPersonnelDialogOpen} onOpenChange={handleDialogClose}>
                  <DialogTrigger asChild>
                      <Button onClick={() => setEditingPersonnel(null)}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Personnel
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                          <DialogTitle>{editingPersonnel ? `Edit Personnel: ${editingPersonnel.name}` : 'Add New Personnel'}</DialogTitle>
                          <DialogDescription>
                              {editingPersonnel ? 'Update the details for this user.' : 'Fill out the form below to add a new person to the roster.'}
                          </DialogDescription>
                      </DialogHeader>
                      <PersonnelForm onSubmit={handleFormSubmit} existingPersonnel={editingPersonnel || undefined} />
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
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Permissions</TableHead>
                  {canEditPersonnel && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnelList.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://placehold.co/40x40.png`} alt={person.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{person.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(person.role)}>{person.role}</Badge>
                    </TableCell>
                    <TableCell>{person.email && person.consentDisplayContact ? person.email : '[Private]'}</TableCell>
                    <TableCell>{person.consentDisplayContact ? person.phone : '[Private]'}</TableCell>
                    <TableCell className="space-x-1 max-w-xs">
                        {person.permissions.map(p => (
                            <Badge key={p} variant="secondary" className="mb-1">{p}</Badge>
                        ))}
                    </TableCell>
                    {canEditPersonnel && (
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm" onClick={() => handleEditClick(person)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {personnelList.length === 0 && (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No personnel found.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </main>
  );
}

PersonnelPage.title = 'Personnel Management';
export default PersonnelPage;
