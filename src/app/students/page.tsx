
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, PlusCircle, Archive, RotateCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewStudentForm } from './new-student-form';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { User, Permission } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { ROLE_PERMISSIONS } from '@/lib/types';

async function getStudentsPageData(companyId: string) {
    const studentsQuery = query(collection(db, `companies/${companyId}/users`), where('role', '==', 'Student'));
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => doc.data() as User);
}

function StudentsPageContent({ initialStudents }: { initialStudents: User[] }) {
  const { toast } = useToast();
  const [students, setStudents] = useState<User[]>(initialStudents);
  const { user, company, loading } = useUser();
  const router = useRouter();

  const fetchStudents = async () => {
      if (!company) return;
      const studentList = await getStudentsPageData(company.id);
      setStudents(studentList);
  };

  const userPermissions = user?.permissions || [];
  const canEdit = userPermissions.includes('Super User') || userPermissions.includes('Students:Edit');

  const activeStudents = students.filter(s => s.status === 'Active');
  const archivedStudents = students.filter(s => s.status === 'Archived');

  const handleStatusChange = async (studentId: string, newStatus: 'Active' | 'Archived') => {
    if (!company) return;
    const studentRef = doc(db, `companies/${company.id}/users`, studentId);
    try {
        await updateDoc(studentRef, { status: newStatus });
        setStudents(prev => prev.map(s => s.id === studentId ? {...s, status: newStatus} : s));
        const student = students.find(s => s.id === studentId);
        toast({
            title: `Student ${newStatus === 'Active' ? 'Reactivated' : 'Archived'}`,
            description: `${student?.name} has been moved to ${newStatus === 'Active' ? 'the active roster' : 'archives'}.`
        });
    } catch (error) {
        console.error(`Error updating student status:`, error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not update the student status.'
        });
    }
  }
  
  const handleNewStudent = async (newStudentData: Omit<User, 'id'>) => {
    if (!company) return;
    
    try {
        const newUserId = doc(collection(db, 'temp')).id;

        const studentToAdd: User = {
            ...newStudentData,
            id: newUserId,
            companyId: company.id,
            role: 'Student',
            status: 'Active',
            permissions: ROLE_PERMISSIONS['Student'],
            flightHours: 0,
            progress: 0,
            endorsements: [],
            trainingLogs: [],
        };
        delete studentToAdd.password;

        await setDoc(doc(db, `companies/${company.id}/users`, newUserId), studentToAdd);
        setStudents(prev => [...prev, studentToAdd]);
        toast({
            title: 'Student Added',
            description: `${newStudentData.name} has been added to the roster.`
        });
    } catch (error: any) {
        console.error("Error creating student:", error);
        toast({ variant: 'destructive', title: 'Error', description: "Could not create new student." });
    }
  }


  const StudentTable = ({ list, isArchived }: { list: User[], isArchived?: boolean }) => (
     <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Instructor</TableHead>
            <TableHead>Flight Hours</TableHead>
            <TableHead>Training Progress</TableHead>
            <TableHead></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {list.map((student) => (
            <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.instructor}</TableCell>
                <TableCell>{student.flightHours?.toFixed(1)}</TableCell>
                <TableCell>
                <div className="flex items-center gap-2">
                    <Progress value={student.progress} className="w-2/3" />
                    <span>{student.progress}%</span>
                </div>
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/students/${student.id}`}>
                                View Profile
                                <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {isArchived ? (
                                        <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'Active')}>
                                            <RotateCw className="mr-2 h-4 w-4" />
                                            Reactivate
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={() => handleStatusChange(student.id, 'Archived')}>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Archive
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
  );

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Roster</CardTitle>
          {canEdit && (
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Student
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Student</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to add a new student. This will create a user account for them.
                        </DialogDescription>
                    </DialogHeader>
                    <NewStudentForm onSubmit={handleNewStudent} />
                </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
              <TabsList>
                  <TabsTrigger value="active">Active ({activeStudents.length})</TabsTrigger>
                  <TabsTrigger value="archived">Archived ({archivedStudents.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="pt-4">
                  <StudentTable list={activeStudents} />
              </TabsContent>
              <TabsContent value="archived" className="pt-4">
                  <StudentTable list={archivedStudents} isArchived />
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function StudentsPage() {
    const companyId = 'skybound-aero'; // Placeholder for company context
    const initialStudents = await getStudentsPageData(companyId);
    return <StudentsPageContent initialStudents={initialStudents} />;
}


StudentsPage.title = "Student Management";
