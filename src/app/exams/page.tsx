
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Exam } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ExamForm } from './exam-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ExamsPage() {
    const { company, user } = useUser();
    const { toast } = useToast();
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingExam, setEditingExam] = React.useState<Exam | null>(null);

    const fetchExams = React.useCallback(async () => {
        if (!company) return;
        try {
            const examsQuery = query(collection(db, `companies/${company.id}/exams`));
            const snapshot = await getDocs(examsQuery);
            setExams(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Exam)));
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load exams.' });
        }
    }, [company, toast]);

    React.useEffect(() => {
        fetchExams();
    }, [fetchExams]);

    const canEdit = user?.permissions.includes('Exams:Edit') || user?.permissions.includes('Super User');

    const handleFormSubmit = async (data: Omit<Exam, 'id' | 'companyId'>) => {
        if (!company) return;
        const examData = { ...data, companyId: company.id };

        try {
            if (editingExam) {
                const docRef = doc(db, `companies/${company.id}/exams`, editingExam.id);
                await updateDoc(docRef, examData as any);
                toast({ title: 'Exam Updated' });
            } else {
                await addDoc(collection(db, `companies/${company.id}/exams`), examData);
                toast({ title: 'Exam Created' });
            }
            fetchExams();
            setIsDialogOpen(false);
            setEditingExam(null);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save exam.' });
        }
    };

    const handleDelete = async (examId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/exams`, examId));
            fetchExams();
            toast({ title: 'Exam Deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete exam.' });
        }
    };

    const openEditDialog = (exam: Exam) => {
        setEditingExam(exam);
        setIsDialogOpen(true);
    };

    const openNewDialog = () => {
        setEditingExam(null);
        setIsDialogOpen(true);
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
                                    <p>{exam.questions.length} questions</p>
                                </CardContent>
                                {canEdit && (
                                    <CardFooter className="flex justify-end gap-2">
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

            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingExam(null); }}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{editingExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
                    </DialogHeader>
                    <ExamForm onSubmit={handleFormSubmit} existingExam={editingExam} />
                </DialogContent>
            </Dialog>
        </main>
    );
}

ExamsPage.title = "Exams";
