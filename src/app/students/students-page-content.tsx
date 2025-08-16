

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight, PlusCircle, Archive, RotateCw, Trash2, MoreHorizontal, Mail, Edit } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { EditStudentForm } from './edit-student-form';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export function StudentsPageContent({ initialStudents }: { initialStudents: User[] }) {
  const { toast } = useToast();
  const [students, setStudents] = useState<User[]>(initialStudents);
  const { user, company, loading } = useUser();
  const router = useRouter();
  const [isNewStudentOpen, setIsNewStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<User | null>(null);

  const userPermissions = user?.permissions || [];
  const canEdit = userPermissions.includes('Super User') || userPermissions.includes('Students:Edit');

  const activeStudents = students.filter(s => s.status === 'Active');
  const archivedStudents = students.filter(s => s.status === 'Archived');

  const fetchStudents = async () => {
    if (!company) return;
    const q = query(collection(db, `companies/${company.id}/students`));
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
  };

  const handleUpdateStudent = async (updatedData: User) => {
    if (!company) return;
    try {
        const studentRef = doc(db, `companies/${company.id}/students`, updatedData.id);
        await updateDoc(studentRef, { ...updatedData });
        fetchStudents();
        setEditingStudent(null);
        toast({ title: 'Student Updated', description: `${updatedData.name}'s details have been saved.` });
    } catch (error) {
        console.error('Failed to update student:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update student details.' });
    }
  };

  const handleStatusChange = async (studentId: string, newStatus: 'Active' | 'Archived') => {
    if (!company) return;
    const studentRef = doc(db, `companies/${company.id}/students`, studentId);
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

  const handleDeleteStudent = async (studentId: string) => {
    if (!company) return;
    try {
      const studentRef = doc(db, `companies/${company.id}/students`, studentId);
      await deleteDoc(studentRef);
      // Note: Deleting from Firebase Auth should be handled by a backend function for security.
      // This implementation only removes the database record.
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast({
        title: 'Student Deleted',
        description: 'The student has been permanently removed from the system.',
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not delete the student record.',
      });
    }
  };

  const handleSendWelcomeEmail = async (student: User) => {
    if (!student.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Student email is missing.'});
      return;
    }

    try {
        await sendPasswordResetEmail(auth, student.email);
        
        toast({
            title: 'Password Reset Email Sent',
            description: `An email has been sent to ${student.name} with instructions to set their password.`,
        });

    } catch (error) {
        console.error("Error sending welcome email:", error);
        toast({
            variant: 'destructive',
            title: 'Email Failed',
            description: 'Could not send the welcome email. Please check if the user exists in Firebase Authentication.',
        });
    }
  }

  const StudentCardList = ({ list, isArchived }: { list: User[], isArchived?: boolean }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {list.map((student) => (
            <Card key={student.id} className={cn("flex flex-col", isArchived && 'bg-muted/50')}>
                 <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{student.name}</CardTitle>
                            <CardDescription>
                                Instructor: {student.instructor}
                                {student.licenseType && ` | ${student.licenseType}`}
                            </CardDescription>
                        </div>
                         {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSendWelcomeEmail(student)}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Welcome Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => setEditingStudent(student)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
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
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem
                                            onSelect={(e) => e.preventDefault()}
                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                            >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the student record for {student.name}.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteStudent(student.id)}>
                                                Yes, delete student
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                    <div className="text-sm">
                        <span className="text-muted-foreground">Total Flight Hours: </span>
                        <span className="font-semibold">{student.flightHours?.toFixed(1) || '0.0'}</span>
                    </div>
                     <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-medium text-muted-foreground">Training Progress</span>
                            <span className="text-sm font-bold">{student.progress || 0}%</span>
                        </div>
                        <Progress value={student.progress || 0} />
                    </div>
                </CardContent>
                 <CardFooter className="border-t pt-4">
                     <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/students/${student.id}`}>
                            View Profile
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        ))}
    </div>
  );

  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Student Roster</CardTitle>
          {canEdit && (
            <Dialog open={isNewStudentOpen} onOpenChange={setIsNewStudentOpen}>
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
                            Fill out the form below to add a new student. This will create their user account.
                        </DialogDescription>
                    </DialogHeader>
                    <NewStudentForm onSuccess={() => { fetchStudents(); setIsNewStudentOpen(false); }} />
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
                  <StudentCardList list={activeStudents} />
              </TabsContent>
              <TabsContent value="archived" className="pt-4">
                  <StudentCardList list={archivedStudents} isArchived />
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editingStudent && (
        <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Student: {editingStudent.name}</DialogTitle>
                    <DialogDescription>
                        Update the details for this student.
                    </DialogDescription>
                </DialogHeader>
                <EditStudentForm 
                    student={editingStudent}
                    onUpdate={handleUpdateStudent}
                />
            </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
