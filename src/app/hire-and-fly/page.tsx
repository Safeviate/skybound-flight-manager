

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Mail, Edit, Trash2, Archive, RotateCw, KeyRound, User as UserIcon, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { sendPasswordResetEmail } from 'firebase/auth';
import { resetUserPasswordAndSendWelcomeEmail } from '@/app/actions';
import { NewHireAndFlyForm } from './new-hire-and-fly-form';
import { EditHireAndFlyForm } from './edit-hire-and-fly-form';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { useSettings } from '@/context/settings-provider';
import { HIRE_AND_FLY_DOCUMENTS } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

function HireAndFlyPage() {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [pilots, setPilots] = React.useState<User[]>([]);
    const [isNewPilotOpen, setIsNewPilotOpen] = React.useState(false);
    const [editingPilot, setEditingPilot] = React.useState<User | null>(null);
    const [viewingDocumentsFor, setViewingDocumentsFor] = React.useState<User | null>(null);
    const { settings } = useSettings();

    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('HireAndFly:Edit');

    const fetchPilots = React.useCallback(async () => {
        if (!company) return;
        try {
            const q = query(collection(db, `companies/${company.id}/hire-and-fly`));
            const snapshot = await getDocs(q);
            setPilots(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
        } catch (error) {
            console.error("Error fetching hire-and-fly pilots:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load pilots.' });
        }
    }, [company, toast]);

    React.useEffect(() => {
        fetchPilots();
    }, [fetchPilots]);

    const activePilots = React.useMemo(() => pilots.filter(p => p.status !== 'Archived'), [pilots]);
    const archivedPilots = React.useMemo(() => pilots.filter(p => p.status === 'Archived'), [pilots]);

    const handleUpdatePilot = async (updatedData: User) => {
        if (!company) return;
        try {
            const pilotRef = doc(db, `companies/${company.id}/hire-and-fly`, updatedData.id);
            await updateDoc(pilotRef, { ...updatedData });
            fetchPilots();
            setEditingPilot(null);
            toast({ title: 'Pilot Updated', description: `${updatedData.name}'s details have been saved.` });
        } catch (error) {
            console.error('Failed to update pilot:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update pilot details.' });
        }
    };
    
    const handleStatusChange = async (pilotId: string, newStatus: 'Active' | 'Archived') => {
        if (!company) return;
        const pilotRef = doc(db, `companies/${company.id}/hire-and-fly`, pilotId);
        try {
            await updateDoc(pilotRef, { status: newStatus });
            fetchPilots();
            toast({ title: `Pilot ${newStatus === 'Active' ? 'Reactivated' : 'Archived'}` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };
    
    const handleDeletePilot = async (pilotId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/hire-and-fly`, pilotId));
            fetchPilots();
            toast({ title: 'Pilot Deleted', description: 'The pilot has been removed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete pilot.' });
        }
    };
    
    const handleSendWelcomeEmail = async (pilot: User) => {
        if (!company) return;
        const result = await resetUserPasswordAndSendWelcomeEmail(pilot, company);
        if (result.success) {
            toast({ title: 'Welcome Email Sent', description: result.message });
        } else {
             toast({ variant: 'destructive', title: 'Email Failed', description: result.message });
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle>Hire and Fly Pilots</CardTitle>
                        <CardDescription>Manage pilots for private (non-training) flights.</CardDescription>
                    </div>
                    {canEdit && (
                        <Dialog open={isNewPilotOpen} onOpenChange={setIsNewPilotOpen}>
                            <DialogTrigger asChild>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Pilot</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Hire and Fly Pilot</DialogTitle>
                                </DialogHeader>
                                <NewHireAndFlyForm onSuccess={() => { fetchPilots(); setIsNewPilotOpen(false); }} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="active">
                        <TabsList>
                            <TabsTrigger value="active">Active Pilots</TabsTrigger>
                            <TabsTrigger value="archived">Archived Pilots</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active" className="pt-4">
                            <PilotList pilots={activePilots} canEdit={canEdit} setEditingPilot={setEditingPilot} handleStatusChange={handleStatusChange} handleSendWelcomeEmail={handleSendWelcomeEmail} isArchived={false} handleDeletePilot={handleDeletePilot} setViewingDocumentsFor={setViewingDocumentsFor} />
                        </TabsContent>
                        <TabsContent value="archived" className="pt-4">
                            <PilotList pilots={archivedPilots} canEdit={canEdit} setEditingPilot={setEditingPilot} handleStatusChange={handleStatusChange} handleSendWelcomeEmail={handleSendWelcomeEmail} isArchived={true} handleDeletePilot={handleDeletePilot} setViewingDocumentsFor={setViewingDocumentsFor} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
            {editingPilot && (
                <Dialog open={!!editingPilot} onOpenChange={() => setEditingPilot(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Pilot: {editingPilot.name}</DialogTitle>
                        </DialogHeader>
                        <EditHireAndFlyForm pilot={editingPilot} onUpdate={handleUpdatePilot} />
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
                    <ScrollArea className="max-h-[70vh]">
                        <div className="py-4 space-y-4 pr-4">
                            {HIRE_AND_FLY_DOCUMENTS.map(docType => {
                                const userDoc = viewingDocumentsFor.documents?.find(d => d.type === docType);
                                return (
                                    <div key={docType} className="flex items-center justify-between text-sm">
                                        <span>{docType}</span>
                                        {getExpiryBadge(userDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
       )}
        </main>
    );
}

const PilotList = ({ pilots, canEdit, setEditingPilot, handleStatusChange, handleSendWelcomeEmail, isArchived, handleDeletePilot, setViewingDocumentsFor }: { pilots: User[], canEdit: boolean, setEditingPilot: (pilot: User | null) => void, handleStatusChange: (id: string, status: 'Active' | 'Archived') => void, handleSendWelcomeEmail: (pilot: User) => void, isArchived: boolean, handleDeletePilot: (id: string) => void, setViewingDocumentsFor: (pilot: User) => void }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pilots.map(pilot => (
                <Card key={pilot.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>{pilot.name}</CardTitle>
                            {canEdit && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setEditingPilot(pilot)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleSendWelcomeEmail(pilot)}><Mail className="mr-2 h-4 w-4" /> Send Welcome Email</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setViewingDocumentsFor(pilot)}>
                                            <Eye className="mr-2 h-4 w-4" /> View Documents
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {isArchived ? (
                                            <>
                                                <DropdownMenuItem onClick={() => handleStatusChange(pilot.id, 'Active')}><RotateCw className="mr-2 h-4 w-4" /> Reactivate</DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete {pilot.name}.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeletePilot(pilot.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <DropdownMenuItem onClick={() => handleStatusChange(pilot.id, 'Archived')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{pilot.email}</p>
                        <p className="text-sm text-muted-foreground">{pilot.phone}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

HireAndFlyPage.title = "Hire and Fly";

export default HireAndFlyPage;
