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

const personnelData: Personnel[] = [
  { id: '1', name: 'Mike Ross', role: 'Instructor', email: 'mike.r@skybound.com', phone: '555-0101' },
  { id: '2', name: 'Sarah Connor', role: 'Instructor', email: 'sarah.c@skybound.com', phone: '555-0102' },
  { id: '3', name: 'Hank Hill', role: 'Maintenance', email: 'hank.h@skybound.com', phone: '555-0103' },
  { id: '4', name: 'Laura Croft', role: 'Instructor', email: 'laura.c@skybound.com', phone: '555-0104' },
  { id: '5', name: 'Admin User', role: 'Admin', email: 'admin@skybound.com', phone: '555-0100' },
];

export default function PersonnelPage() {
    const getRoleVariant = (role: Personnel['role']) => {
        switch (role) {
            case 'Instructor':
                return 'default';
            case 'Maintenance':
                return 'secondary';
            case 'Admin':
                return 'outline'
            default:
                return 'outline';
        }
    }
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Personnel Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Staff List</CardTitle>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Personnel
            </Button>
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
