
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
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
import { studentData } from '@/lib/mock-data';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewStudentForm } from './new-student-form';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react';

export default function StudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>(studentData);

  const activeStudents = students.filter(s => s.status === 'Active');
  const archivedStudents = students.filter(s => s.status === 'Archived');

  const handleArchive = (studentId: string) => {
    // In a real app, this would be an API call.
    setStudents(prev => prev.map(s => s.id === studentId ? {...s, status: 'Archived'} : s));
    const student = students.find(s => s.id === studentId);
    toast({
        title: "Student Archived",
        description: `${student?.name} has been moved to archives.`
    });
  }

  const handleReactivate = (studentId: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? {...s, status: 'Active'} : s));
    const student = students.find(s => s.id === studentId);
    toast({
        title: "Student Reactivated",
        description: `${student?.name} has been moved to the active roster.`
    });
  }

  const StudentTable = ({ list, isArchived }: { list: Student[], isArchived?: boolean }) => (
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
                <TableCell>{student.flightHours.toFixed(1)}</TableCell>
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isArchived ? (
                                     <DropdownMenuItem onClick={() => handleReactivate(student.id)}>
                                        <RotateCw className="mr-2 h-4 w-4" />
                                        Reactivate
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleArchive(student.id)}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        Archive
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableCell>
            </TableRow>
            ))}
        </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Student Management" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Student Roster</CardTitle>
            <Dialog>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Student
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Student</DialogTitle>
                        <DialogDescription>
                            Fill out the form below to add a new student.
                        </DialogDescription>
                    </DialogHeader>
                    <NewStudentForm />
                </DialogContent>
            </Dialog>
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
    </div>
  );
}
