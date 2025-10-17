
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Eye, Mail, Phone, Archive, RotateCw, KeyRound, MessageSquare } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { resetUserPasswordAndSendWelcomeEmail } from '@/app/actions';
import { adminResetPassword } from '@/ai/flows/admin-reset-password-flow';
import { adminSendSms } from '@/ai/flows/admin-send-sms-flow';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditPersonnelForm } from './edit-personnel-form';
import { useSettings } from '@/context/settings-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getPersonnelPageData } from './data';
import { Separator } from '@/components/ui/separator';
import { ALL_DOCUMENTS } from '@/lib/types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export function PersonnelPageContent({ initialPersonnel }: { initialPersonnel: PersonnelUser[] }) {
    const { user, company, loading } = useUser();
    const { settings } = useSettings();
    const router = useRouter();
    const [personnel, setPersonnel] = useState<PersonnelUser[]>(initialPersonnel);
    const [isNewPersonnelOpen, setIsNewPersonnelOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<PersonnelUser | null>(null);
    const [viewingDocumentsFor, setViewingDocumentsFor] = useState<PersonnelUser | null>(null);
    const { toast } = useToast();
    const [passwordResetFor, setPasswordResetFor] = useState<PersonnelUser | null>(null);
    const [tempPassword, setTempPassword] = useState('');
    
    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');
    const canCreateTempPassword = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:CreateTempPassword');


    useEffect(() => {
        setPersonnel(initialPersonnel);
    }, [initialPersonnel]);

    const groupPersonnelByDepartment = (personnelList: PersonnelUser[]) => {
        return personnelList.reduce((acc, person) => {
            const department = person.department || 'Uncategorized';
            if (!acc[department]) {
                acc[department] = [];
            }
            acc[department].push(person);
            return acc;
        }, {} as Record<string, PersonnelUser[]>);
    };

    const activePersonnel = useMemo(() => personnel.filter(p => p.status !== 'Archived'), [personnel]);
    const archivedPersonnel = useMemo(() => personnel.filter(p => p.status === 'Archived'), [personnel]);
    
    const groupedActivePersonnel = useMemo(() => groupPersonnelByDepartment(activePersonnel), [activePersonnel]);
    const groupedArchivedPersonnel = useMemo(() => groupPersonnelByDepartment(archivedPersonnel), [archivedPersonnel]);

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
            const dataToSave = {
                ...updatedData,
                department: updatedData.department || null,
            };
            await updateDoc(userRef, JSON.parse(JSON.stringify(dataToSave)));
            await fetchPersonnel();
            setEditingPersonnel(null);
            toast({ title: 'Personnel Updated', description: `${updatedData.name}'s details have been saved.` });
        } catch (error) {
            console.error('Failed to update personnel:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update personnel details.' });
        }
    };

    const handleStatusChange = async (personnelId: string, newStatus: 'Active' | 'Archived') => {
        if (!company) return;
        const userRef = doc(db, `companies/${company.id}/users`, personnelId);
        try {
            await updateDoc(userRef, { status: newStatus });
            await fetchPersonnel();
            toast({
                title: `Personnel ${newStatus === 'Active' ? 'Reactivated' : 'Archived'}`,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
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
        if (!company) return;
        const result = await resetUserPasswordAndSendWelcomeEmail(person, company);
        if (result.success) {
            toast({
                title: 'Welcome Email Sent',
                description: result.message,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Email Failed',
                description: result.message,
            });
        }
    };

    const handleSendSmsLogin = async (person: PersonnelUser) => {
        if (!person.phone) {
            toast({ variant: 'destructive', title: 'Error', description: 'This user does not have a phone number on file.' });
            return;
        }
        try {
            const result = await adminSendSms({ userId: person.id, phone: person.phone });
            if (result.success) {
                toast({
                    title: 'SMS Sent',
                    description: `A login code has been sent to ${person.name} at ${person.phone}.`,
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'SMS Failed',
                description: `Could not send SMS: ${error.message}`,
            });
        }
    };
    
    const handleSendPasswordReset = async (person: PersonnelUser) => {
        if (!person.email) {
            toast({ variant: 'destructive', title: 'Error', description: 'This user does not have an email address on file.' });
            return;
        }
        try {
            await sendPasswordResetEmail(auth, person.email);
            toast({
                title: 'Password Reset Email Sent',
                description: `A password reset link has been sent to ${person.name}.`,
            });
        } catch (error: any) {
            console.error("Error sending password reset email:", error);
            toast({
                variant: 'destructive',
                title: 'Email Failed',
                description: 'Could not send the password reset email. Check if the user exists in Firebase Authentication.',
            });
        }
    };
    
    const handleCreateTempPassword = (person: PersonnelUser) => {
        const newPassword = Math.random().toString(36).slice(-8);
        setTempPassword(newPassword);
        setPasswordResetFor(person);
    };

    const handleConfirmPasswordReset = async () => {
        if (!passwordResetFor || !company) return;

        const result = await adminResetPassword({ userId: passwordResetFor.id, newPassword: tempPassword });
        if (result.success) {
            const userRef = doc(db, `companies/${company.id}/users`, passwordResetFor.id);
            await updateDoc(userRef, { mustChangePassword: true });
            toast({ title: 'Password Reset Successful', description: `Password for ${passwordResetFor.name} has been updated.` });
        } else {
            toast({ variant: 'destructive', title: 'Password Reset Failed', description: result.message });
        }
    };

    const PersonnelCardList = ({ list, isArchived }: { list: PersonnelUser[], isArchived?: boolean }) => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {list.map(person => (
                <Card key={person.id} className="flex flex-col">
                    <CardHeader>
                            <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{person.name}</CardTitle>
                                <CardDescription>
                                    {person.role}
                                </CardDescription>
                            </div>
                            {canEdit && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setEditingPersonnel(person)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleSendWelcomeEmail(person)}><Mail className="mr-2 h-4 w-4" /> Send Welcome Email</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleSendPasswordReset(person)}><KeyRound className="mr-2 h-4 w-4" /> Send Password Reset</DropdownMenuItem>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <MessageSquare className="mr-2 h-4 w-4" /> Send SMS Login
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm SMS Action</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will send a one-time login code to {person.name} at {person.phone}. Are you sure?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleSendSmsLogin(person)}>Yes, Send SMS</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        {canCreateTempPassword && (
                                            <DropdownMenuItem onSelect={() => handleCreateTempPassword(person)}>
                                                <KeyRound className="mr-2 h-4 w-4" /> Create Manual Password
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onSelect={() => setViewingDocumentsFor(person)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Documents
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {isArchived ? (
                                            <>
                                                <DropdownMenuItem onClick={() => handleStatusChange(person.id, 'Active')}><RotateCw className="mr-2 h-4 w-4" /> Reactivate</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete {person.name}.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeletePersonnel(person.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange(person.id, 'Archived')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm flex-grow">
                        <p className="font-semibold">{person.department}</p>
                        <Separator />
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{person.email || 'No email on file'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{person.phone}</span>
                                </div>
                            </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setViewingDocumentsFor(person)}>
                            <Eye className="mr-2 h-4 w-4" /> View Documents
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
    
    const DepartmentGroup = ({ departmentName, personnelList, isArchived }: { departmentName: string, personnelList: PersonnelUser[], isArchived?: boolean }) => (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{departmentName}</h2>
            <PersonnelCardList list={personnelList} isArchived={isArchived} />
        </div>
    );

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div>
                  <CardTitle>Personnel Roster</CardTitle>
                  <CardDescription>A list of all active and archived staff members.</CardDescription>
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
            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Active Staff ({activePersonnel.length})</TabsTrigger>
                    <TabsTrigger value="archived">Archived Staff ({archivedPersonnel.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4 space-y-8">
                    {Object.keys(groupedActivePersonnel).sort().map(dept => (
                        <DepartmentGroup key={dept} departmentName={dept} personnelList={groupedActivePersonnel[dept]} />
                    ))}
                    {Object.keys(groupedActivePersonnel).length === 0 && (
                        <div className="text-center text-muted-foreground py-10">No active personnel found.</div>
                    )}
                </TabsContent>
                <TabsContent value="archived" className="mt-4 space-y-8">
                    {Object.keys(groupedArchivedPersonnel).sort().map(dept => (
                        <DepartmentGroup key={dept} departmentName={dept} personnelList={groupedArchivedPersonnel[dept]} isArchived />
                    ))}
                     {Object.keys(groupedArchivedPersonnel).length === 0 && (
                        <div className="text-center text-muted-foreground py-10">No archived personnel found.</div>
                    )}
                </TabsContent>
            </Tabs>
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
        <Dialog open={!!passwordResetFor} onOpenChange={() => setPasswordResetFor(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Temporary Password</DialogTitle>
                    <DialogDescription>
                        A new temporary password has been generated for {passwordResetFor?.name}. Please communicate this to them securely. They will be required to change it on their next login.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="p-4 bg-muted rounded-lg text-center font-mono text-xl tracking-widest">
                        {tempPassword}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setPasswordResetFor(null)}>Cancel</Button>
                    <Button onClick={handleConfirmPasswordReset}>Confirm &amp; Reset</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </main>
  );
}

    