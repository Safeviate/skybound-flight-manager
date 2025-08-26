
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { PlusCircle, Edit, Trash2, Network } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CompanyRole, CompanyDepartment } from '@/lib/types';


const itemFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const ItemForm = ({
  onSubmit,
  existingItem
}: {
  onSubmit: (data: ItemFormValues) => void;
  existingItem?: { id: string; name: string } | null;
}) => {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: existingItem || { name: '' },
  });
  
  React.useEffect(() => {
    if (existingItem) {
        form.reset({ name: existingItem.name });
    } else {
        form.reset({ name: '' });
    }
  }, [existingItem, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit">{existingItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
};


const ManagementSection = ({ title, items, onUpdate, type }: { title: string, items: {id: string, name: string}[], onUpdate: () => void, type: 'roles' | 'departments' }) => {
    const { company } = useUser();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<{id: string, name: string} | null>(null);

    const handleFormSubmit = async (data: ItemFormValues) => {
        if (!company) return;
        
        try {
            if (editingItem) {
                const docRef = doc(db, `companies/${company.id}/${type}`, editingItem.id);
                await updateDoc(docRef, { name: data.name });
                toast({ title: `${title.slice(0, -1)} Updated` });
            } else {
                await addDoc(collection(db, `companies/${company.id}/${type}`), { name: data.name });
                toast({ title: `${title.slice(0, -1)} Added` });
            }
            onUpdate();
            setIsDialogOpen(false);
            setEditingItem(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to save ${title.toLowerCase().slice(0, -1)}.` });
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/${type}`, itemId));
            onUpdate();
            toast({ title: `${title.slice(0, -1)} Deleted` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete ${title.toLowerCase().slice(0, -1)}.` });
        }
    };

    const openEditDialog = (item: {id: string, name: string}) => {
        setEditingItem(item);
        setIsDialogOpen(true);
    };

    const openNewDialog = () => {
        setEditingItem(null);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex-row justify-between items-center">
                <CardTitle>{title}</CardTitle>
                <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete "{item.name}". This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={2} className="h-24 text-center">No {type} found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                 <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {title.slice(0, -1)}</DialogTitle>
                        </DialogHeader>
                        <ItemForm onSubmit={handleFormSubmit} existingItem={editingItem} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default function RolesAndDepartmentsPage() {
    const { company } = useUser();
    const { toast } = useToast();
    const [roles, setRoles] = React.useState<CompanyRole[]>([]);
    const [departments, setDepartments] = React.useState<CompanyDepartment[]>([]);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const rolesQuery = query(collection(db, `companies/${company.id}/roles`));
            const deptsQuery = query(collection(db, `companies/${company.id}/departments`));
            const [rolesSnapshot, deptsSnapshot] = await Promise.all([
                getDocs(rolesQuery),
                getDocs(deptsQuery)
            ]);
            setRoles(rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyRole)));
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load company roles or departments.' });
        }
    }, [company, toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <main className="flex-1 p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Network /> Roles & Departments</CardTitle>
                    <CardDescription>
                        Manage the roles and departments available for assignment within your company.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                   <ManagementSection title="Roles" items={roles} onUpdate={fetchData} type="roles" />
                   <ManagementSection title="Departments" items={departments} onUpdate={fetchData} type="departments" />
                </CardContent>
            </Card>
        </main>
    );
}

RolesAndDepartmentsPage.title = "Roles & Departments";
