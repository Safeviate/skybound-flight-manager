
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
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
import { PlusCircle, Edit } from 'lucide-react';
import { userData as initialUserData } from '@/lib/data-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PersonnelForm } from './personnel-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function PersonnelPage() {
    const { user, loading } = useUser();
    const [personnelList, setPersonnelList] = useState(initialUserData.filter(u => u.role !== 'Student'));
    const [editingPersonnel, setEditingPersonnel] = useState<User | null>(null);
    const [isNewPersonnelDialogOpen, setIsNewPersonnelDialogOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);
    
    const canEditPersonnel = user?.permissions.includes('Super User') || user?.permissions.includes('Personnel:Edit');

    const handleFormSubmit = (personnelData: Omit<User, 'id'>) => {
        if (editingPersonnel) {
            // Update existing personnel
            const updatedList = personnelList.map(p => p.id === editingPersonnel.id ? { ...editingPersonnel, ...personnelData } : p);
            setPersonnelList(updatedList);
            toast({ title: 'Personnel Updated', description: `${personnelData.name}'s information has been saved.` });
        } else {
            // Add new personnel
            const newUser: User = {
                id: `p-${Date.now()}`,
                ...personnelData,
                permissions: personnelData.permissions || [],
            };
            setPersonnelList(prev => [...prev, newUser]);
            toast({ title: 'Personnel Added', description: `${personnelData.name} has been added to the roster.` });
        }
        setEditingPersonnel(null);
        setIsNewPersonnelDialogOpen(false);
    };
    
    const handleEditClick = (person: User) => {
        setEditingPersonnel(person);
    }
    
    const handleDialogClose = () => {
        setEditingPersonnel(null);
        setIsNewPersonnelDialogOpen(false);
    }

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
            default:
                return 'outline'
        }
    }

  if (loading || !user) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header title="Personnel Management" />
            <div className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Personnel Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Personnel Roster</CardTitle>
              <CardDescription>A list of all non-student personnel in the system.</CardDescription>
            </div>
            {canEditPersonnel && (
              <Dialog open={isNewPersonnelDialogOpen} onOpenChange={setIsNewPersonnelDialogOpen}>
                  <DialogTrigger asChild>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Personnel
                      </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                      <DialogHeader>
                          <DialogTitle>Add New Personnel</DialogTitle>
                          <DialogDescription>
                              Fill out the form below to add a new person to the roster.
                          </DialogDescription>
                      </DialogHeader>
                      <PersonnelForm onSubmit={handleFormSubmit} />
                  </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Permissions</TableHead>
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
                    <TableCell>{person.consentDisplayContact ? person.email : '[Private]'}</TableCell>
                    <TableCell>{person.consentDisplayContact ? person.phone : '[Private]'}</TableCell>
                    <TableCell className="space-x-1 max-w-xs">
                        {person.permissions.map(p => (
                            <Badge key={p} variant="secondary" className="mb-1">{p}</Badge>
                        ))}
                    </TableCell>
                    {canEditPersonnel && (
                        <TableCell className="text-right">
                           <Dialog open={editingPersonnel?.id === person.id} onOpenChange={(isOpen) => !isOpen && handleDialogClose()}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(person)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Edit Personnel: {person.name}</DialogTitle>
                                        <DialogDescription>
                                            Update the details for this user.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <PersonnelForm onSubmit={handleFormSubmit} existingPersonnel={person} />
                                </DialogContent>
                            </Dialog>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

    
