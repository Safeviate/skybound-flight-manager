
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Users } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Exam, User, ExamAssignment, ExamAttempt } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ExamForm } from './exam-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';

const AssignExamDialog = ({ exam, allUsers, onAssign }: { exam: Exam, allUsers: User[], onAssign: (assignedUserIds: string[]) => void }) => {
    const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>(exam.assignedTo?.map(a => a.userId) || []);

    const userOptions = allUsers.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));

    const handleSave = () => {
        onAssign(selectedUserIds);
    };

    const selectedUsersDisplay = React.useMemo(() => {
        return selectedUserIds.map(id => {
            const user = allUsers.find(u => u.id === id);
            return { value: id, label: user ? `${user.name} (${user.role})` : id };
        });
    }, [selectedUserIds, allUsers]);

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Exam: {exam.title}</DialogTitle>
                <DialogDescription>
                    Select the users and students who should be assigned this exam.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <MultiSelect
                    options={userOptions}
                    selected={selectedUserIds}
                    displayValues={selectedUsersDisplay}
                    onChange={setSelectedUserIds}
                    placeholder="Select users and students..."
                />
            </div>
            <DialogFooter>
                <Button onClick={handleSave}>Save Assignments</Button>
            </DialogFooter>
        </DialogContent>
    );
};

const ExamResultsTab = ({ exams, attempts, users }: { exams: Exam[], attempts: ExamAttempt[], users: User[] }) => {
    
    const results = React.useMemo(() => {
        return attempts.map(attempt => {
            const exam = exams.find(e => e.id === attempt.examId);
            const user = users.find(u => u.id === attempt.userId);
            return {
                ...attempt,
                examTitle: exam?.title || 'Unknown Exam',
                userName: user?.name || 'Unknown User',
            };
        });
    }, [attempts, exams, users]);
    
    if (results.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No exam results found.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {results.map(result => (
                    <TableRow key={result.id}>
                        <TableCell>{result.userName}</TableCell>
                        <TableCell>{result.examTitle}</TableCell>
                        <TableCell>{result.score}%</TableCell>
                        <TableCell>
                            <Badge variant={result.score >= 75 ? 'success' : 'destructive'}>
                                {result.score >= 75 ? 'Passed' : 'Failed'}
                            </Badge>
                        </TableCell>
                        <TableCell>{format(parseISO(result.dateTaken), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                             <Button variant="outline" size="sm" disabled>View Details</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function ExamsPage() {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [examAttempts, setExamAttempts] = React.useState<ExamAttempt[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAssignOpen, setIsAssignOpen] = React.useState(false);
    const [selectedExam, setSelectedExam] = React.useState<Exam | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const examsQuery = query(collection(db, `companies/${company.id}/exams`));
            const personnelQuery = query(collection(db, `companies/${company.id}/users`));
            const studentsQuery = query(collection(db, `companies/${company.id}/students`));
            const attemptsQuery = query(collection(db, `companies/${company.id}/exam-attempts`));

            const [examsSnapshot, personnelSnapshot, studentsSnapshot, attemptsSnapshot] = await Promise.all([
                getDocs(examsQuery),
                getDocs(personnelQuery),
                getDocs(studentsQuery),
                getDocs(attemptsQuery),
            ]);

            setExams(examsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Exam)));
            
            const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers([...personnel, ...students]);

            setExamAttempts(attemptsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ExamAttempt)));

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load exams or user data.' });
        }
    }, [company, toast]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const canEdit = user?.permissions.includes('Exams:Edit') || user?.permissions.includes('Super User');

    const handleFormSubmit = async (data: Omit<Exam, 'id' | 'companyId'>) => {
        if (!company) return;
        const examData = { ...data, companyId: company.id };

        try {
            if (selectedExam) {
                const docRef = doc(db, `companies/${company.id}/exams`, selectedExam.id);
                await updateDoc(docRef, examData as any);
                toast({ title: 'Exam Updated' });
            } else {
                await addDoc(collection(db, `companies/${company.id}/exams`), examData);
                toast({ title: 'Exam Created' });
            }
            fetchData();
            setIsFormOpen(false);
            setSelectedExam(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save exam.' });
        }
    };

    const handleDelete = async (examId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/exams`, examId));
            fetchData();
            toast({ title: 'Exam Deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete exam.' });
        }
    };

    const handleAssign = async (examId: string, assignedUserIds: string[]) => {
        if (!company) return;

        const assignments: ExamAssignment[] = assignedUserIds.map(userId => {
            const user = allUsers.find(u => u.id === userId);
            const existingAssignment = exams.find(e => e.id === examId)?.assignedTo?.find(a => a.userId === userId);
            return {
                userId,
                name: user?.name || 'Unknown User',
                status: existingAssignment?.status || 'Not Started',
            };
        });

        const docRef = doc(db, `companies/${company.id}/exams`, examId);
        try {
            await updateDoc(docRef, { assignedTo: assignments });
            fetchData();
            setIsAssignOpen(false);
            setSelectedExam(null);
            toast({ title: 'Assignments Updated', description: 'The exam has been assigned to the selected users.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save assignments.' });
        }
    };

    const openEditDialog = (exam: Exam) => {
        setSelectedExam(exam);
        setIsFormOpen(true);
    };

    const openNewDialog = () => {
        setSelectedExam(null);
        setIsFormOpen(true);
    };

    const openAssignDialog = (exam: Exam) => {
        setSelectedExam(exam);
        setIsAssignOpen(true);
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <Tabs defaultValue="exams" className="w-full">
                <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="exams">Exams</TabsTrigger>
                        <TabsTrigger value="results">Results</TabsTrigger>
                    </TabsList>
                    {canEdit && (
                        <Button onClick={openNewDialog}>
                            <PlusCircle className="mr-2 h-4 w-4" /> New Exam Template
                        </Button>
                    )}
                </div>
                <TabsContent value="exams" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Exam Management</CardTitle>
                            <CardDescription>Create, view, and manage exam templates.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {exams.map(exam => (
                                    <Card key={exam.id}>
                                        <CardHeader>
                                            <CardTitle>{exam.title}</CardTitle>
                                            <CardDescription>{exam.category}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm">{exam.questions.length} questions</p>
                                            <div className="flex items-center text-sm text-muted-foreground mt-2">
                                                <Users className="h-4 w-4 mr-1"/>
                                                Assigned to {exam.assignedTo?.length || 0} user(s)
                                            </div>
                                        </CardContent>
                                        {canEdit && (
                                            <CardFooter className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openAssignDialog(exam)}>
                                                    <Users className="mr-2 h-4 w-4" /> Assign
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => openEditDialog(exam)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete the exam template "{exam.title}".</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(exam.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </CardFooter>
                                        )}
                                    </Card>
                                ))}
                            </div>
                            {exams.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No exam templates have been created yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="results" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Exam Results</CardTitle>
                            <CardDescription>A log of all completed exam attempts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ExamResultsTab exams={exams} attempts={examAttempts} users={allUsers} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setSelectedExam(null); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
                    </DialogHeader>
                    <ExamForm onSubmit={handleFormSubmit} existingExam={selectedExam} />
                </DialogContent>
            </Dialog>

            {selectedExam && (
                 <Dialog open={isAssignOpen} onOpenChange={(open) => { setIsAssignOpen(open); if (!open) setSelectedExam(null); }}>
                    <AssignExamDialog 
                        exam={selectedExam}
                        allUsers={allUsers}
                        onAssign={(userIds) => handleAssign(selectedExam.id, userIds)}
                    />
                </Dialog>
            )}
        </main>
    );
}

ExamsPage.title = "Exams";
