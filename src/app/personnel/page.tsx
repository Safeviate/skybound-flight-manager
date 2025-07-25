
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
        const personnelQuery = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
        const snapshot = await getDocs(personnelQuery);
        const personnel = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setPersonnelList(personnel);
    };
    
    const canEditPersonnel = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');

    const handleFormSubmit = async (personnelData: Omit<User, 'id'>) => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Company context is missing.' });
            return;
        }

        if (editingPersonnel) {
            // Update existing personnel in Firestore
            const userRef = doc(db, `companies/${company.id}/users`, editingPersonnel.id);
            await updateDoc(userRef, personnelData as any);
            toast({ title: 'Personnel Updated', description: `${personnelData.name}'s information has been saved.` });
        } else {
            // Add new personnel to Firestore
            // This path may require creating a user in Firebase Auth first for some roles.
            // For simplicity, we'll assume non-admin roles can be added directly for now.
             const newUserId = doc(collection(db, 'temp')).id;
            const newUserRef = doc(db, `companies/${company.id}/users`, newUserId);
            await setDoc(newUserRef, { ...personnelData, id: newUserId, companyId: company.id });
            toast({ title: 'Personnel Added', description: `${personnelData.name} has been added to the roster.` });
        }
        fetchPersonnel(); // Refetch to get the latest data
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
                  <DialogContent className="sm:max-w-4xl">
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
                    <TableCell>{person.email && person.consentDisplayContact === 'Consented' ? person.email : '[Private]'}</TableCell>
                    <TableCell>{person.consentDisplayContact === 'Consented' ? person.phone : '[Private]'}</TableCell>
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
