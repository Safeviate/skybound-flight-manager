
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Personnel } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import { personnelData } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewPersonnelForm } from './new-personnel-form';


export default function PersonnelPage() {
    const getRoleVariant = (role: Personnel['role']) => {
        switch (role) {
            case 'Instructor':
                return 'primary'
            case 'Maintenance':
                return 'destructive'
            case 'Admin':
                return 'secondary'
            default:
                return 'outline'
        }
    }
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Personnel Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personnel Roster</CardTitle>
            <Dialog>
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
                    <NewPersonnelForm />
                </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnelData.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(person.role)}>{person.role}</Badge>
                    </TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>{person.phone}</TableCell>
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
