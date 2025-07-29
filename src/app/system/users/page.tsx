
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Mail, Search, ArrowUpDown, Loader2, Edit } from 'lucide-react';
import type { User as PersonnelUser, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collectionGroup, query, getDocs, collection, doc, updateDoc } from 'firebase/firestore';
import { sendEmail } from '@/ai/flows/send-email-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls.ts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_PERMISSIONS } from '@/lib/types';

const ALL_ROLES = Object.keys(ROLE_PERMISSIONS) as Role[];


function SystemUsersPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<PersonnelUser[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<PersonnelUser | null>(null);
    const [newRole, setNewRole] = useState<Role | null>(null);
    const { toast } = useToast();
    
    const { items: filteredUsers, searchTerm, setSearchTerm, requestSort, sortConfig } = useTableControls(allUsers, {
        initialSort: { key: 'name', direction: 'asc' },
        searchKeys: ['name', 'email', 'companyId', 'role'],
    });

    useEffect(() => {
        if (!loading && (!user || !user.permissions.includes('Super User'))) {
            router.push('/my-dashboard');
        } else if (user) {
            fetchAllUsers();
        }
    }, [user, loading, router]);
    
    const fetchAllUsers = async () => {
        setIsDataLoading(true);
        try {
            const usersQuery = query(collectionGroup(db, 'users'));
            const snapshot = await getDocs(usersQuery);
            const usersList = snapshot.docs.map(doc => doc.data() as PersonnelUser);
            setAllUsers(usersList);
        } catch (error) {
            console.error("Error fetching all users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch system users.' });
        } finally {
            setIsDataLoading(false);
        }
    };
    
    const openEditDialog = (userToEdit: PersonnelUser) => {
        setEditingUser(userToEdit);
        setNewRole(userToEdit.role);
    };

    const handleRoleChange = async () => {
        if (!editingUser || !newRole) return;

        try {
            const userRef = doc(db, `companies/${editingUser.companyId}/users`, editingUser.id);
            const permissions = ROLE_PERMISSIONS[newRole] || [];
            
            await updateDoc(userRef, {
                role: newRole,
                permissions: permissions,
            });

            setAllUsers(prevUsers => 
                prevUsers.map(u => 
                    u.id === editingUser.id ? { ...u, role: newRole, permissions } : u
                )
            );
            
            toast({
                title: 'Role Updated',
                description: `${editingUser.name}'s role has been changed to ${newRole}.`,
            });
            setEditingUser(null);
            setNewRole(null);

        } catch (error) {
            console.error("Error updating role:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the user\'s role.' });
        }
    };

    const handleResendWelcome = async (targetUser: PersonnelUser) => {
        if (!targetUser.email) {
            toast({ variant: 'destructive', title: 'Action Failed', description: 'This user does not have an email address on file.' });
            return;
        }

        toast({ title: 'Sending Email...', description: `A new welcome email is being sent to ${targetUser.name}.` });

        try {
            const temporaryPassword = Math.random().toString(36).slice(-8);

            await sendEmail({
                to: targetUser.email,
                subject: `Your SkyBound Flight Manager Account`,
                emailData: {
                    userName: targetUser.name,
                    companyName: targetUser.companyId, // Or a more friendly name if available
                    userEmail: targetUser.email,
                    temporaryPassword: temporaryPassword,
                    loginUrl: window.location.origin + '/login',
                },
            });
            
            toast({
                title: 'Email Sent!',
                description: `A new temporary password has been sent to ${targetUser.name}.`,
            });
        } catch (error) {
            console.error("Error resending welcome email:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send the email.' });
        }
    };

    if (loading || isDataLoading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading system users...</p>
            </main>
        );
    }
    
    const SortableHeader = ({ label, sortKey }: { label: string, sortKey: keyof PersonnelUser }) => {
        const isSorted = sortConfig?.key === sortKey;
        return (
            <Button variant="ghost" onClick={() => requestSort(sortKey)}>
                {label}
                {isSorted && <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.direction === 'asc' ? '' : 'rotate-180'}`} />}
                {!isSorted && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
            </Button>
        );
    };

    return (
        <main className="flex-1 p-4 md:p-8 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>System Users</CardTitle>
                    <CardDescription>A list of all users across all companies registered in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center py-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                            placeholder="Search by name, email, company, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            />
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><SortableHeader label="Name" sortKey="name" /></TableHead>
                                <TableHead><SortableHeader label="Company" sortKey="companyId" /></TableHead>
                                <TableHead><SortableHeader label="Role" sortKey="role" /></TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(person => (
                                <TableRow key={person.id}>
                                    <TableCell className="font-medium">{person.name}</TableCell>
                                    <TableCell>{person.companyId}</TableCell>
                                    <TableCell>{person.role}</TableCell>
                                    <TableCell>{person.email || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => openEditDialog(person)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit Role
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleResendWelcome(person)} disabled={!person.email}>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Resend Welcome Email
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {filteredUsers.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No users found.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Role for {editingUser?.name}</DialogTitle>
                        <DialogDescription>
                            Select a new role. The user's permissions will be updated accordingly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={newRole || ''} onValueChange={(value) => setNewRole(value as Role)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {ALL_ROLES.map(role => (
                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                        <Button onClick={handleRoleChange}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}

SystemUsersPage.title = 'System User Management';
export default SystemUsersPage;
