
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PersonnelForm } from './personnel-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { sendEmail } from '@/ai/flows/send-email-flow';
import NewUserCredentialsEmail from '@/components/emails/new-user-credentials-email';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


function PersonnelPage() {
    const { user, company, loading } = useUser();
    const [personnelList, setPersonnelList] = useState<User[]>([]);
    const [editingPersonnel, setEditingPersonnel] = useState<User | null>(null);
    const [isNewPersonnelDialogOpen, setIsNewPersonnelDialogOpen] = useState(false);
    const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
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
            // This is the logic for adding a new user.
            const needsAuthAccount = personnelData.role === 'Admin' || personnelData.role === 'External Auditee';

            if (needsAuthAccount) {
                // This path is for users requiring authentication.
                if (!personnelData.email || !personnelData.password) {
                    toast({ variant: 'destructive', title: 'Missing Information', description: 'Email and password are required for this role.'});
                    return;
                }
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, personnelData.email, personnelData.password);
                    const newUserId = userCredential.user.uid;
                    // Add companyId to the auth user profile for easy lookup on login
                    await updateProfile(userCredential.user, { photoURL: company.id });

                    const newUserRef = doc(db, `companies/${company.id}/users`, newUserId);
                    const finalUserData = { ...personnelData, id: newUserId, companyId: company.id };
                    await setDoc(newUserRef, finalUserData);

                    toast({ title: 'Personnel Added', description: `${personnelData.name} has been added.` });
                    
                    try {
                         await sendEmail({
                            to: personnelData.email,
                            subject: `Your Access to ${company.name} Portal`,
                            react: <NewUserCredentialsEmail
                                userName={personnelData.name}
                                companyName={company.name}
                                userEmail={personnelData.email}
                                temporaryPassword={personnelData.password}
                                loginUrl={window.location.origin + '/login'}
                            />,
                        });
                         toast({ title: 'Invitation Sent', description: `An email with login details has been sent to ${personnelData.name}.` });
                    } catch (emailError) {
                        console.error("Failed to send invitation email:", emailError);
                        toast({ variant: 'destructive', title: 'Email Failed', description: 'The user was created, but the invitation email could not be sent. Please send credentials manually.'})
                    }
                } catch (error: any) {
                    let errorMessage = 'Could not create the user in the authentication system.';
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'This email address is already registered. Please use a different email.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'The provided password is too weak.';
                    }
                     toast({ variant: 'destructive', title: 'Authentication Error', description: errorMessage });
                     return; // Stop execution if auth creation fails
                }
            } else {
                // This path is for users NOT requiring authentication.
                const newUserId = doc(collection(db, 'temp')).id;
                const newUserRef = doc(db, `companies/${company.id}/users`, newUserId);
                await setDoc(newUserRef, { ...personnelData, id: newUserId, companyId: company.id });
                toast({ title: 'Personnel Added', description: `${personnelData.name} has been added to the roster.` });
            }
        }
        
        fetchPersonnel();
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
    
    const handleDeleteSelected = async () => {
        if (!company || selectedPersonnel.length === 0) return;

        const batch = writeBatch(db);
        selectedPersonnel.forEach(id => {
            const userRef = doc(db, `companies/${company.id}/users`, id);
            batch.delete(userRef);
        });

        try {
            await batch.commit();
            toast({
                title: 'Personnel Deleted',
                description: `${selectedPersonnel.length} user(s) have been successfully deleted.`
            });
            setSelectedPersonnel([]);
            fetchPersonnel();
        } catch (error) {
            console.error("Error deleting personnel:", error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Could not delete the selected personnel.'
            });
        }
    };


    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedPersonnel(personnelList.map(p => p.id));
        } else {
            setSelectedPersonnel([]);
        }
    };
    
    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedPersonnel(prev => 
            checked ? [...prev, id] : prev.filter(pid => pid !== id)
        );
    };

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
            case 'External Auditee':
                return 'outline'
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
            <div className="flex items-center gap-2">
                {selectedPersonnel.length > 0 && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Selected ({selectedPersonnel.length})
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete {selectedPersonnel.length} user(s).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected}>
                                    Yes, delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
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
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                     <Checkbox
                        checked={personnelList.length > 0 && selectedPersonnel.length === personnelList.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  {canEditPersonnel && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnelList.map((person) => (
                  <TableRow key={person.id} data-state={selectedPersonnel.includes(person.id) && "selected"}>
                     <TableCell>
                        <Checkbox
                            checked={selectedPersonnel.includes(person.id)}
                            onCheckedChange={(checked) => handleSelectOne(person.id, !!checked)}
                            aria-label="Select row"
                        />
                     </TableCell>
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
