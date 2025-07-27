
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
import { PlusCircle, Edit, Database, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PersonnelForm } from './personnel-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { userData as seedUsers } from '@/lib/data-provider';
import { sendEmail } from '@/ai/flows/send-email-flow';
import NewUserCredentialsEmail from '@/components/emails/new-user-credentials-email';

function PersonnelPage() {
    const { user, company, loading } = useUser();
    const [personnelList, setPersonnelList] = useState<User[]>([]);
    const [editingPersonnel, setEditingPersonnel] = useState<User | null>(null);
    const [isNewPersonnelDialogOpen, setIsNewPersonnelDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [isSeeding, setIsSeeding] = useState(false);

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
            // We separate users that need an auth account from those who don't.
            if ((personnelData.role === 'Admin' || personnelData.role === 'External Auditee')) {
                // This path is for users requiring authentication.
                if (!personnelData.email || !personnelData.password) {
                    toast({ variant: 'destructive', title: 'Missing Information', description: 'Email and password are required for this role.'});
                    return;
                }
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, personnelData.email, personnelData.password);
                    const newUserId = userCredential.user.uid;
                    const newUserRef = doc(db, `companies/${company.id}/users`, newUserId);
                    
                    const finalUserData = { ...personnelData, id: newUserId, companyId: company.id };
                    await setDoc(newUserRef, finalUserData);

                    toast({ title: 'Personnel Added', description: `${personnelData.name} has been added.` });
                    
                    if (personnelData.role === 'External Auditee') {
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
                    }
                } catch (error: any) {
                    let errorMessage = 'Could not create the user in the authentication system.';
                    if (error.code === 'auth/email-already-in-use') {
                        errorMessage = 'This email address is already registered in the authentication system. Please use a different email or contact support if you believe this is an error.';
                    } else if (error.code === 'auth/weak-password') {
                        errorMessage = 'The provided password is too weak. Please use a stronger password.';
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
        
        // This runs after either path (update or add) completes.
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

    const handleSeedPersonnel = async () => {
        if (!company) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No company selected. Cannot seed data.',
          });
          return;
        }

        if (seedUsers.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Seed Data',
                description: 'There is no sample user data available to seed.',
            });
            return;
        }
    
        setIsSeeding(true);
        try {
          const batch = writeBatch(db);
          const usersToSeed = seedUsers.filter(u => u.companyId === 'skybound-aero' && u.role !== 'Student');
    
          usersToSeed.forEach(user => {
            const { password, ...userData } = user;
            const userRef = doc(db, `companies/${company.id}/users`, user.id);
            batch.set(userRef, { ...userData, companyId: company.id });
          });
    
          await batch.commit();
    
          toast({
            title: 'Database Seeded',
            description: `${usersToSeed.length} personnel have been added to your company's database.`,
          });
          fetchPersonnel(); // Refresh the list
        } catch (error) {
          console.error('Error seeding database:', error);
          toast({
            variant: 'destructive',
            title: 'Seeding Failed',
            description: 'An error occurred while trying to seed the database.',
          });
        } finally {
          setIsSeeding(false);
        }
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
                <Button onClick={handleSeedPersonnel} variant="outline" disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Seed Sample Personnel
                </Button>
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

    
