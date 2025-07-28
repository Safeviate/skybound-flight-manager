
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Mail, Search, ArrowUpDown, Loader2 } from 'lucide-react';
import type { User as PersonnelUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collectionGroup, query, getDocs, collection } from 'firebase/firestore';
import { sendEmail } from '@/ai/flows/send-email-flow';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { useTableControls } from '@/hooks/use-table-controls';

function SystemUsersPage() {
    const { user, company, loading } = useUser();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<PersonnelUser[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
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
        </main>
    );
}

SystemUsersPage.title = 'System User Management';
export default SystemUsersPage;
