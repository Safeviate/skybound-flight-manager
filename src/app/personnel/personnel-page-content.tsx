
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Mail } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPersonnelForm } from './edit-personnel-form';
import { useSettings } from '@/context/settings-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getPersonnelPageData } from './data';
import { Separator } from '@/components/ui/separator';
import { ALL_DOCUMENTS } from '@/lib/types';
import { sendPasswordResetEmail } from 'firebase/auth';


export function PersonnelPageContent({ initialPersonnel }: { initialPersonnel: PersonnelUser[] }) {
    const { user, company, loading } = useUser();
    const { settings } = useSettings();
    const router = useRouter();
    const [personnel, setPersonnel] = useState<PersonnelUser[]>(initialPersonnel);
    const [isNewPersonnelOpen, setIsNewPersonnelOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<PersonnelUser | null>(null);
    const [viewingDocumentsFor, setViewingDocumentsFor] = useState<PersonnelUser | null>(null);
    const { toast } = useToast();
    
    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');

    useEffect(() => {
        setPersonnel(initialPersonnel);
    }, [initialPersonnel]);

    const fetchPersonnel = async () => {
        if (!company) return;
        const personnelData = await getPersonnelPageData(company.id);
        setPersonnel(personnelData);
    };

    const handleSuccess = () => {
        fetchPersonnel();
        setIsNewPersonnelOpen(false);
    }
    
    const handleUpdatePersonnel = async (updatedData: PersonnelUser) => {
        if (!company) return;
        
        try {
            const userRef = doc(db, `companies/${company.id}/users`, updatedData.id);
            const permissions = ROLE_PERMISSIONS[updatedData.role] || [];
            await updateDoc(userRef, { ...updatedData, permissions });
            await fetchPersonnel();
            setEditingPersonnel(null);
            toast({ title: 'Personnel Updated', description: `${updatedData.name}'s details have been saved.` });
        } catch (error) {
            console.error('Failed to update personnel:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update personnel details.' });
        }
    };

    const handleDeletePersonnel = async (personnelId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/users`, personnelId));
            // Note: Deleting from Firebase Auth should be handled by a backend function for security.
            // This implementation only removes the database record.
            await fetchPersonnel();
            toast({ title: 'Personnel Deleted', description: 'The user has been removed from the roster.' });
        } catch (error) {
            console.error("Error deleting personnel:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete personnel.' });
        }
    };
    
    const handleSendWelcomeEmail = async (person: PersonnelUser) => {
        if (!person.email) {
          toast({ variant: 'destructive', title: 'Error', description: 'User email is missing.'});
          return;
        }
        const companyName = "Skybound Aero";

        try {
            await sendPasswordResetEmail(auth, person.email);

            await sendEmail({
                to: person.email,
                subject: `Welcome to ${companyName}`,
                emailData: {
                    userName: person.name,
                    companyName: companyName,
                    userEmail: person.email,
                    loginUrl: window.location.origin + '/login',
                },
            });
            
            toast({
                title: 'Welcome Email Sent',
                description: `A welcome email with a password reset link has been sent to ${person.name}.`,
            });

        } catch (error) {
            console.error("Error sending welcome email:", error);
            toast({
                variant: 'destructive',
                title: 'Email Failed',
                description: 'Could not send the welcome email. Please try again.',
            });
        }
    };

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
                                  Add a new staff member to the system. This will create their user account.
                              </DialogDescription>
                          </DialogHeader>
                          <NewPersonnelForm onSuccess={handleSuccess} />
                      </DialogContent>
                  </Dialog>
              )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {personnel.map(person => (
                    <Card key={person.id} className="flex flex-col">
                        <CardHeader>
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{person.name}</CardTitle>
                                    <CardDescription>{person.role}</CardDescription>
                                </div>
                                {canEdit && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleSendWelcomeEmail(person)}>
                                                <Mail className="mr-2 h-4 w-4" />
                                                Send Welcome Email
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => setEditingPersonnel(person)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete {person.name} from the system.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeletePersonnel(person.id)}>
                                                            Yes, Delete Personnel
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm flex-grow">
                            <p className="text-muted-foreground">{person.department}</p>
                            <Separator />
                            <div>
                                <p>{person.email}</p>
                                <p>{person.phone}</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingDocumentsFor(person)}>
                                <Eye className="mr-2 h-4 w-4" /> View Documents
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
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
       {viewingDocumentsFor && (
            <Dialog open={!!viewingDocumentsFor} onOpenChange={() => setViewingDocumentsFor(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Document Expiry Dates for {viewingDocumentsFor.name}</DialogTitle>
                        <DialogDescription>
                            A list of all official documents and their expiry dates.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {ALL_DOCUMENTS.map(docType => {
                            const userDoc = viewingDocumentsFor.documents?.find(d => d.type === docType);
                            return (
                                <div key={docType} className="flex items-center justify-between text-sm">
                                    <span>{docType}</span>
                                    {getExpiryBadge(userDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                                </div>
                            )
                        })}
                    </div>
                </DialogContent>
            </Dialog>
       )}
    </main>
  );
}
