

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Users } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Exam, User, ExamAssignment } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ExamForm } from './exam-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';

const AssignExamDialog = ({ exam, allUsers, onAssign }: { exam: Exam, allUsers: User[], onAssign: (assignedUserIds: string[]) => void }) => {
    const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>(exam.assignedTo?.map(a => a.userId) || []);

    const userOptions = allUsers.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }));

    const handleSave = () => {
        onAssign(selectedUserIds);
    };

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

export default function ExamsPage() {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isAssignOpen, setIsAssignOpen] = React.useState(false);
    const [selectedExam, setSelectedExam] = React.useState<Exam | null>(null);

    const fetchData = React.useCallback(async () => {
        if (!company) return;
        try {
            const examsQuery = query(collection(db, `companies/${company.id}/exams`));
            const personnelQuery = query(collection(db, `companies/${company.id}/users`));
            const studentsQuery = query(collection(db, `companies/${company.id}/students`));

            const [examsSnapshot, personnelSnapshot, studentsSnapshot] = await Promise.all([
                getDocs(examsQuery),
                getDocs(personnelQuery),
                getDocs(studentsQuery)
            ]);

            setExams(examsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Exam)));
            
            const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers([...personnel, ...students]);

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
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle>Exam Management</CardTitle>
                        <CardDescription>Create, view, and manage exam templates.</CardDescription>
                    </div>
                    {canEdit && (
                        <Button onClick={openNewDialog}><PlusCircle className="mr-2 h-4 w-4" /> New Exam Template</Button>
                    )}
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
