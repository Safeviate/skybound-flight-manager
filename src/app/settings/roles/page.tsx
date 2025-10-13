

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { PlusCircle, Edit, Trash2, Network } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CompanyRole, CompanyDepartment, Permission, User, CompanyAuditArea } from '@/lib/types';
import { PermissionsListbox } from '@/app/personnel/permissions-listbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const itemFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  permissions: z.array(z.string()).optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const ItemForm = ({
  onSubmit,
  existingItem,
  isRole,
  allPermissions,
}: {
  onSubmit: (data: ItemFormValues) => void;
  existingItem?: { id: string; name: string, permissions?: Permission[] } | null;
  isRole?: boolean;
  allPermissions: Permission[];
}) => {
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
        name: existingItem?.name || '',
        permissions: existingItem?.permissions || [],
    },
  });
  
  React.useEffect(() => {
    form.reset({
        name: existingItem?.name || '',
        permissions: existingItem?.permissions || [],
    });
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
        {isRole && (
            <FormField
                control={form.control}
                name="permissions"
                render={() => (
                    <FormItem>
                        <FormLabel>Permissions</FormLabel>
                        <PermissionsListbox control={form.control} allPermissions={allPermissions} />
                        <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <div className="flex justify-end pt-2">
          <Button type="submit">{existingItem ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </form>
    </Form>
  );
};


const ManagementSection = ({ title, items, onUpdate, type, allPermissions, canEdit }: { title: string, items: (CompanyRole | CompanyDepartment | CompanyAuditArea)[], onUpdate: () => void, type: 'roles' | 'departments' | 'audit-areas', allPermissions: Permission[], canEdit: boolean }) => {
    const { company } = useUser();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<CompanyRole | CompanyDepartment | CompanyAuditArea | null>(null);
    const isRole = type === 'roles';

    const handleFormSubmit = async (data: ItemFormValues) => {
        if (!company) return;
        
        try {
            if (editingItem) {
                const docRef = doc(db, `companies/${company.id}/${type}`, editingItem.id);
                await updateDoc(docRef, data as any);
                toast({ title: `${title.slice(0, -1)} Updated` });
            } else {
                await addDoc(collection(db, `companies/${company.id}/${type}`), data);
                toast({ title: `${title.slice(0, -1)} Added` });
            }
            onUpdate();
            setIsDialogOpen(false);
            setEditingItem(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to save ${type.toLowerCase().slice(0, -1)}.` });
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/${type}`, itemId));
            onUpdate();
            toast({ title: `${title.slice(0, -1)} Deleted` });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: `Failed to delete ${type.toLowerCase().slice(0, -1)}.` });
        }
    };

    const openEditDialog = (item: CompanyRole | CompanyDepartment | CompanyAuditArea) => {
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
                {canEdit && <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            {isRole && <TableHead>Permissions</TableHead>}
                            {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length > 0 ? items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.name}</TableCell>
                                {isRole && (
                                    <TableCell className="text-xs text-muted-foreground">
                                        {(item as CompanyRole).permissions?.length || 0} assigned
                                    </TableCell>
                                )}
                                {canEdit && (
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
                                )}
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={isRole ? 3 : (canEdit ? 2 : 1)} className="h-24 text-center">No {type} found.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
                 <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
                    <DialogContent className={cn("sm:max-w-md", isRole && "sm:max-w-2xl")}>
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit' : 'Add'} {title.slice(0, -1)}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className={cn(isRole && "h-[70vh] pr-4")}>
                           <ItemForm 
                                onSubmit={handleFormSubmit} 
                                existingItem={editingItem} 
                                isRole={isRole} 
                                allPermissions={allPermissions}
                            />
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default function RolesAndDepartmentsPage() {
    const { company, user, updateCompany } = useUser();
    const { toast } = useToast();
    const [roles, setRoles] = React.useState<CompanyRole[]>([]);
    const [departments, setDepartments] = React.useState<CompanyDepartment[]>([]);
    const [auditAreas, setAuditAreas] = React.useState<CompanyAuditArea[]>([]);
    const [allPermissions, setAllPermissions] = React.useState<Permission[]>(ALL_PERMISSIONS);
    const [personnel, setPersonnel] = React.useState<User[]>([]);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const rolesQuery = query(collection(db, `companies/${company.id}/roles`));
            const deptsQuery = query(collection(db, `companies/${company.id}/departments`));
            const auditAreasQuery = query(collection(db, `companies/${company.id}/audit-areas`));
            const personnelQuery = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
            
            const [rolesSnapshot, deptsSnapshot, auditAreasSnapshot, personnelSnapshot] = await Promise.all([
                getDocs(rolesQuery),
                getDocs(deptsQuery),
                getDocs(auditAreasQuery),
                getDocs(personnelQuery),
            ]);
            setRoles(rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyRole)));
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));
            setAuditAreas(auditAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyAuditArea)));
            setPersonnel(personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load company roles or departments.' });
        }
    }, [company, toast]);
    
    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleInstructorSelection = async (personId: string, isSelected: boolean) => {
        if (!company) return;
        
        const currentIds = company.instructorIds || [];
        const newIds = isSelected
            ? [...currentIds, personId]
            : currentIds.filter(id => id !== personId);
            
        const success = await updateCompany(company.id, { instructorIds: newIds });
        if (success) {
          toast({ title: 'Instructor List Updated' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to update instructor list.' });
        }
      };

    const canView = user?.permissions.includes('Super User') || user?.permissions.includes('Roles & Departments:View');
    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Roles & Departments:Edit');

    if (!canView) {
        return (
            <main className="flex-1 p-4 md:p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>You do not have permission to view this page.</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex-1 p-4 md:p-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Network /> Roles & Departments</CardTitle>
                    <CardDescription>
                        Manage the roles, departments, and audit areas available for assignment within your company.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                   <ManagementSection title="Roles" items={roles} onUpdate={fetchData} type="roles" allPermissions={allPermissions} canEdit={canEdit} />
                   <ManagementSection title="Departments" items={departments} onUpdate={fetchData} type="departments" allPermissions={allPermissions} canEdit={canEdit} />
                   <div className="md:col-span-2">
                    <ManagementSection title="Audit Areas" items={auditAreas} onUpdate={fetchData} type="audit-areas" allPermissions={allPermissions} canEdit={canEdit} />
                   </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Designate Instructors</CardTitle>
                    <CardDescription>Select which personnel are designated as instructors for student assignments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {personnel.map((person) => (
                            <div key={person.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`instructor-${person.id}`}
                                    checked={company?.instructorIds?.includes(person.id)}
                                    onCheckedChange={(checked) => handleInstructorSelection(person.id, !!checked)}
                                    disabled={!canEdit}
                                />
                                <label
                                    htmlFor={`instructor-${person.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {person.name} <span className="text-muted-foreground text-xs">({person.role})</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

RolesAndDepartmentsPage.title = "Roles & Departments";

