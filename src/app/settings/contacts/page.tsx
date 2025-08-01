

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import type { ExternalContact } from '@/lib/types';
import { ContactForm } from './contact-form';

export default function ExternalContactsPage() {
  const { company, user } = useUser();
  const { toast } = useToast();
  const [contacts, setContacts] = React.useState<ExternalContact[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<ExternalContact | null>(null);

  const fetchContacts = React.useCallback(async () => {
    if (!company) return;
    try {
      const contactsQuery = query(collection(db, `companies/${company.id}/external-contacts`));
      const snapshot = await getDocs(contactsQuery);
      setContacts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ExternalContact)));
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load contacts.' });
    }
  }, [company, toast]);

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const canEdit = user?.permissions.includes('Settings:Edit') || user?.permissions.includes('Super User');

  const handleFormSubmit = async (data: Omit<ExternalContact, 'id' | 'companyId'>) => {
    if (!company) return;
    const contactData = { ...data, companyId: company.id };

    try {
      if (editingContact) {
        const docRef = doc(db, `companies/${company.id}/external-contacts`, editingContact.id);
        await setDoc(docRef, contactData);
        toast({ title: 'Contact Updated' });
      } else {
        await addDoc(collection(db, `companies/${company.id}/external-contacts`), contactData);
        toast({ title: 'Contact Added' });
      }
      fetchContacts();
      setIsDialogOpen(false);
      setEditingContact(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save contact.' });
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!company) return;
    try {
        await deleteDoc(doc(db, `companies/${company.id}/external-contacts`, contactId));
        fetchContacts();
        toast({ title: 'Contact Deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete contact.' });
    }
  };

  const openEditDialog = (contact: ExternalContact) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingContact(null);
    setIsDialogOpen(true);
  };

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader className="flex-row justify-between items-start">
          <div>
            <CardTitle>External Contacts</CardTitle>
            <CardDescription>
              Manage a list of external email contacts for sending reports and notifications.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add Contact</Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Description</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length > 0 ? (
                contacts.map(contact => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.description}</TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => openEditDialog(contact)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the contact for {contact.name}.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(contact.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center">
                    No external contacts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canEdit && (
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingContact(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit' : 'Add'} External Contact</DialogTitle>
            </DialogHeader>
            <ContactForm onSubmit={handleFormSubmit} existingContact={editingContact} />
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}

ExternalContactsPage.title = 'External Contacts';
