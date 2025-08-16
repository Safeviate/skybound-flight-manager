
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, User, Award, BookUser, Calendar as CalendarIcon, Edit, PlusCircle, UserCheck, Plane, BookOpen, Clock, Download, Archive, User as UserIcon, Book, Trash2, Search, ChevronLeft, ChevronRight, Wind, Users as UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Endorsement, TrainingLogEntry, Permission, User as StudentUser, Booking, Alert } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { AddEndorsementForm } from './add-endorsement-form';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { AddLogEntryForm } from './add-log-entry-form';
import { useUser } from '@/context/user-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, writeBatch, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { useSettings } from '@/context/settings-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function StudentProfilePage({ initialStudent }: { initialStudent: StudentUser | null }) {
    const { user: currentUser, company, loading: userLoading } = useUser();
    const { settings } = useSettings();
    const { toast } = useToast();
    const router = useRouter();
    const [student, setStudent] = useState<StudentUser | null>(initialStudent);
    const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
    
    const [progress, setProgress] = useState(student?.progress || 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        setStudent(initialStudent);
        setProgress(initialStudent?.progress || 0);
    }, [initialStudent]);

     useEffect(() => {
        const fetchPendingBookings = async () => {
            if (!student || !company || !student.pendingBookingIds || student.pendingBookingIds.length === 0) {
                setPendingBookings([]);
                return;
            }
            try {
                // Firestore 'in' queries are limited to 30 items. We may need to chunk this for students with many bookings.
                const bookingsQuery = query(collection(db, `companies/${company.id}/bookings`), where('id', 'in', student.pendingBookingIds.slice(0, 30)));
                const snapshot = await getDocs(bookingsQuery);
                const bookings = snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Booking));
                setPendingBookings(bookings);
            } catch (error) {
                console.error("Error fetching pending bookings:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load pending bookings for this student.' });
            }
        };

        if (student) {
            fetchPendingBookings();
        }
    }, [student, company, toast]);
    
    const canEdit = currentUser?.permissions.includes('Super User') || currentUser?.permissions.includes('Students:Edit');
    
    const sortedLogs = useMemo(() => {
        return student?.trainingLogs?.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()) || [];
    }, [student?.trainingLogs]);
    
    const totalFlightHours = useMemo(() => {
        return student?.trainingLogs?.reduce((total, log) => total + (log.flightDuration || 0), 0) || 0;
    }, [student?.trainingLogs]);


    const filteredLogs = useMemo(() => {
        if (!searchTerm) return sortedLogs;
        return sortedLogs.filter(log =>
            log.aircraft.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.trainingExercises.some(ex => ex.comment?.toLowerCase().includes(searchTerm.toLowerCase()) || ex.exercise.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [sortedLogs, searchTerm]);

    const paginatedLogs = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLogs, currentPage]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    
    const handleUpdate = async (updateData: Partial<StudentUser>) => {
        if (!student || !company) return;
        const studentRef = doc(db, `companies/${company.id}/students`, student.id);
        try {
            await updateDoc(studentRef, updateData);
            setStudent(prev => prev ? { ...prev, ...updateData } : null);
        } catch (error) {
            console.error("Failed to update student:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save changes.' });
        }
    }

    const handleProgressSave = () => {
        handleUpdate({ progress });
        toast({
            title: "Progress Updated",
            description: `${student?.name}'s training progress has been set to ${progress}%.`,
        });
    }

    const handleAddEndorsement = (newEndorsement: Omit<Endorsement, 'id'>) => {
        const endorsementWithId: Endorsement = { ...newEndorsement, id: `endorsement-${Date.now()}` };
        handleUpdate({ endorsements: arrayUnion(endorsementWithId) });
    };

    const handleAddLogEntry = async (newLogEntry: Omit<TrainingLogEntry, 'id'>, fromBookingId?: string) => {
        if (!company || !student) return;

        const entryWithId: TrainingLogEntry = { ...newLogEntry, id: `log-${Date.now()}` };
        const currentLogs = student?.trainingLogs || [];
        const newTotalHours = [...currentLogs, entryWithId].reduce((total, log) => total + (log.flightDuration || 0), 0);

        const milestones = [10, 20, 30];
        const notificationsSent = student.milestoneNotificationsSent || [];
        const newNotifications: number[] = [];

        for (const milestone of milestones) {
            const threshold = milestone - 1;
            if (newTotalHours >= threshold && !notificationsSent.includes(milestone)) {
                const headOfTrainingQuery = query(collection(db, `companies/${company.id}/users`), where('role', '==', 'Head Of Training'));
                const hotSnapshot = await getDocs(headOfTrainingQuery);
                const hot = hotSnapshot.empty ? null : hotSnapshot.docs[0].data() as StudentUser;
                const instructor = (await getDocs(query(collection(db, `companies/${company.id}/users`), where('name', '==', student.instructor)))).docs[0]?.data() as StudentUser;

                const targetUserIds = [hot?.id, instructor?.id].filter(Boolean) as string[];

                for (const targetId of targetUserIds) {
                     const newAlert: Omit<Alert, 'id'|'number'> = {
                        companyId: company.id,
                        type: 'Task',
                        title: `Milestone Alert: ${student.name}`,
                        description: `${student.name} is approaching the ${milestone}-hour milestone with ${newTotalHours.toFixed(1)} total hours. Please schedule a progress check.`,
                        author: 'System',
                        date: new Date().toISOString(),
                        readBy: [],
                        targetUserId: targetId,
                        relatedLink: `/students/${student.id}`,
                    };
                    await addDoc(collection(db, `companies/${company.id}/alerts`), newAlert);
                }
                newNotifications.push(milestone);
            }
        }
        
        const updateData: Partial<StudentUser> = {
            trainingLogs: arrayUnion(entryWithId),
            flightHours: newTotalHours,
            milestoneNotificationsSent: arrayUnion(...newNotifications),
        };

        if (fromBookingId) {
            const updatedPendingIds = student?.pendingBookingIds?.filter(id => id !== fromBookingId) || [];
            updateData.pendingBookingIds = updatedPendingIds;
            setPendingBookings(prev => prev.filter(b => b.id !== fromBookingId));
        }

        await handleUpdate(updateData);

        if (fromBookingId) {
            const bookingRef = doc(db, `companies/${company.id}/bookings`, fromBookingId);
            await updateDoc(bookingRef, { status: 'Completed', flightDuration: newLogEntry.flightDuration });
        }

        toast({
            title: 'Training Log Added',
            description: 'A new entry has been added to the student logbook.',
        });
    };

    const handleDownloadLogbook = () => {
        if (!student) return;
    
        const doc = new jsPDF();
        let startY = 54;
    
        doc.setFontSize(20);
        doc.text("Student Training Log", 14, 22);
    
        doc.setFontSize(12);
        doc.text(`Student: ${student.name}`, 14, 32);
        doc.text(`Instructor: ${student.instructor || 'N/A'}`, 14, 38);
        doc.text(`Total Flight Hours: ${totalFlightHours.toFixed(1)}`, 14, 44);
    
        if (student.endorsements && student.endorsements.length > 0) {
            autoTable(doc, {
                startY: startY,
                head: [['Endorsement', 'Date Awarded', 'Awarded By']],
                body: student.endorsements.map(e => [e.name, e.dateAwarded, e.awardedBy]),
                headStyles: { fillColor: [34, 197, 94] },
            });
            startY = (doc as any).lastAutoTable.finalY + 10;
        }
    
        if (student.trainingLogs && student.trainingLogs.length > 0) {
             autoTable(doc, {
                startY: startY,
                head: [['Date', 'Aircraft', 'Hobbs Start', 'Hobbs End', 'Duration', 'Instructor', 'Notes']],
                body: student.trainingLogs.map(log => [
                    log.date,
                    log.aircraft,
                    log.startHobbs.toFixed(1),
                    log.endHobbs.toFixed(1),
                    log.flightDuration.toFixed(1),
                    log.instructorName,
                    log.trainingExercises.map(e => `${e.exercise}: ${e.comment || ''}`).join('\n'),
                ]),
                headStyles: { fillColor: [34, 197, 94] },
                columnStyles: {
                    6: { cellWidth: 'auto' },
                }
            });
        }
        
        const fileName = `${student.name.replace(/\s+/g, '_').toLowerCase()}_logbook.pdf`;
        doc.save(fileName);
    };

    const handleArchive = async () => {
        if (!student || !company) return;
        const studentRef = doc(db, `companies/${company.id}/students`, student.id);
        try {
            await updateDoc(studentRef, { status: 'Archived' });
            toast({
                title: "Student Archived",
                description: `${student?.name} has been moved to the archives.`,
            });
            router.push('/students');
        } catch (error) {
            console.error("Failed to archive student:", error);
            toast({ variant: 'destructive', title: 'Archive Failed', description: 'Could not archive student record.' });
        }
    }
    
    const formatDecimalTime = (decimalHours: number | undefined) => {
        if (typeof decimalHours !== 'number' || isNaN(decimalHours)) {
            return '00:00';
        }
        const hours = Math.floor(decimalHours);
        const minutes = Math.round((decimalHours - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const MilestoneProgress = ({ currentHours }: { currentHours: number }) => {
        const milestones = [
            { name: '10 Hour Check', target: 10 },
            { name: '20 Hour Check', target: 20 },
            { name: '30 Hour Check', target: 30 },
        ];

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Milestone Progress</CardTitle>
                    <CardDescription>Progress towards key flight hour milestones.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {milestones.map(milestone => {
                        const progress = Math.min((currentHours / milestone.target) * 100, 100);
                        const hoursRemaining = Math.max(milestone.target - currentHours, 0);

                        return (
                            <div key={milestone.name}>
                                <div className="flex justify-between mb-1 text-sm">
                                    <span className="font-medium">{milestone.name}</span>
                                    <span className="text-muted-foreground">{hoursRemaining.toFixed(1)} hrs remaining</span>
                                </div>
                                <Progress value={progress} />
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        )
    };


    if (userLoading) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <p>Loading student profile...</p>
            </main>
        )
    }

    if (!student) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <p>Student not found.</p>
            </main>
        )
    }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="logbook">Logbook</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-6">
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-8">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-center space-x-0 sm:space-x-4 space-y-4 sm:space-y-0">
                                    <div className="p-4 rounded-full bg-muted">
                                        <UserIcon className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl text-center sm:text-left">{student.name}</CardTitle>
                                        <CardDescription className="mt-1 text-center sm:text-left">
                                           <Badge variant={student.status === 'Active' ? 'success' : 'secondary'}>{student.status} Student</Badge>
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4 border-t pb-6">
                                <div className="flex items-center space-x-3">
                                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">Instructor: {student.instructor}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <BookUser className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-medium">Total Flight Hours: {formatDecimalTime(totalFlightHours)}</span>
                                </div>
                                
                                {(student.documents || []).map(doc => (
                                     <div key={doc.id} className="flex items-center space-x-3">
                                        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                        <span>{doc.type}: {getExpiryBadge(doc.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {student.licenseType !== 'PPL' && <MilestoneProgress currentHours={totalFlightHours} />}

                         <Card>
                            <CardHeader>
                                <div className="flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle>Endorsements</CardTitle>
                                        <CardDescription>Qualifications and completed milestones.</CardDescription>
                                    </div>
                                    {canEdit && (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm">
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add New Endorsement</DialogTitle>
                                                    <DialogDescription>
                                                        Fill out the form to add a new endorsement for {student.name}.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <AddEndorsementForm studentId={student.id} onSubmit={handleAddEndorsement}/>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                        <TableHead>Endorsement</TableHead>
                                        <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {student.endorsements && student.endorsements.length > 0 ? student.endorsements.map((endorsement) => (
                                        <TableRow key={endorsement.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <Award className="h-4 w-4 text-accent"/>
                                                {endorsement.name}
                                            </TableCell>
                                            <TableCell>{format(parseISO(endorsement.dateAwarded), 'MMM d, yyyy')}</TableCell>
                                        </TableRow>
                                        )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                                No endorsements found.
                                            </TableCell>
                                        </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        {canEdit && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Admin Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                                <Archive className="mr-2 h-4 w-4" /> Archive Student
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will archive {student.name}'s profile. They will no longer appear in active lists but their data will be retained.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleArchive}>Yes, Archive Student</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="space-y-1">
                                    <CardTitle>Training Logbook</CardTitle>
                                    <CardDescription>Total Flight Hours: {formatDecimalTime(totalFlightHours)} hrs</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto pt-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button asChild variant="link" className="p-0 h-auto">
                                                <Link href="#">
                                                    <BookOpen className="mr-2 h-4 w-4" />
                                                    View Full Logbook
                                                </Link>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl">
                                            <DialogHeader>
                                                <DialogTitle>Full Training Logbook: {student.name}</DialogTitle>
                                            </DialogHeader>
                                            <ScrollArea className="h-[70vh]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Aircraft</TableHead>
                                                            <TableHead>Duration</TableHead>
                                                            <TableHead>Instructor</TableHead>
                                                            <TableHead>Exercises</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                    {filteredLogs.map((log) => (
                                                        <TableRow key={log.id}>
                                                            <TableCell>{format(parseISO(log.date), 'dd MMM yy')}</TableCell>
                                                            <TableCell>{log.aircraft}</TableCell>
                                                            <TableCell>{log.flightDuration.toFixed(1)}</TableCell>
                                                            <TableCell>{log.instructorName}</TableCell>
                                                            <TableCell>
                                                                {log.trainingExercises.map(e => e.exercise).join(', ')}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>
                                    <div className="relative w-full sm:w-auto">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Search log entries..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                 {paginatedLogs.length > 0 ? (
                                    paginatedLogs.map((log) => (
                                        <div key={log.id} className="grid gap-2 border-b py-4 last:border-b-0">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold">{format(parseISO(log.date), 'MMMM d, yyyy')}</h4>
                                                <Badge variant="outline">{log.instructorName}</Badge>
                                            </div>
                                            <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-x-4 gap-y-1">
                                                <span className="flex items-center gap-1.5"><Plane className="h-4 w-4" /> {log.aircraft}</span>
                                                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {log.flightDuration.toFixed(1)} hrs</span>
                                                <span className="font-mono text-xs"> (H: {log.startHobbs.toFixed(1)} - {log.endHobbs.toFixed(1)})</span>
                                                {log.weatherConditions && <span className="flex items-center gap-1.5"><Wind className="h-4 w-4" /> {log.weatherConditions}</span>}
                                            </div>
                                            <div className="space-y-2 border-l-2 pl-4 py-2 bg-muted/50 rounded-r-lg">
                                                {log.trainingExercises.map((ex, index) => (
                                                    <div key={index}>
                                                        <p className="font-semibold text-sm flex items-center gap-2"><Award className="h-4 w-4 text-accent" /> {ex.exercise}</p>
                                                        {ex.comment && <p className="text-sm text-muted-foreground italic pl-6">"{ex.comment}"</p>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                {log.instructorSignature && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground">Instructor Signature:</p>
                                                        <div className="mt-1 p-2 border rounded-md bg-background inline-block">
                                                            <Image src={log.instructorSignature} alt="Instructor Signature" width={150} height={75} />
                                                        </div>
                                                    </div>
                                                )}
                                                {log.studentSignature && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground">Student Signature:</p>
                                                        <div className="mt-1 p-2 border rounded-md bg-background inline-block">
                                                            <Image src={log.studentSignature} alt="Student Signature" width={150} height={75} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                     <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                        <p className="text-muted-foreground">No training logs found.</p>
                                     </div>
                                )}
                                 {totalPages > 1 && (
                                    <div className="flex items-center justify-center space-x-2 pt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePrevPage}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNextPage}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div className="space-y-1">
                                        <CardTitle>Student Debrief</CardTitle>
                                        <CardDescription>These flights are complete and require a logbook entry from the instructor.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button onClick={handleDownloadLogbook} variant="outline" className="w-full sm:w-auto">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download PDF
                                        </Button>
                                        {canEdit && (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button className="w-full sm:w-auto">
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Add Log Entry
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-4xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Add New Training Log Entry</DialogTitle>
                                                        <DialogDescription>
                                                            Record details of the training session for {student.name}.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <AddLogEntryForm student={student} onSubmit={handleAddLogEntry} />
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/students">
                                            <UsersIcon className="mr-2 h-4 w-4" />
                                            View All Student Debriefs
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                            {pendingBookings.length > 0 ? (
                                pendingBookings.map(booking => (
                                    <Dialog key={booking.id}>
                                        <DialogTrigger asChild>
                                            <div className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors flex justify-between items-center cursor-pointer">
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm">{booking.bookingNumber}: Flight on {format(parseISO(booking.date), 'PPP')}</p>
                                                    <p className="text-xs text-muted-foreground">Aircraft: {booking.aircraft} | Instructor: {booking.instructor}</p>
                                                </div>
                                                <span className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Log Flight</span>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl">
                                            <DialogHeader>
                                                <DialogTitle>Add Training Log Entry</DialogTitle>
                                                <DialogDescription>
                                                    Record details of the training session for {student.name}.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <AddLogEntryForm student={student} onSubmit={(data) => handleAddLogEntry(data, booking.id)} booking={booking}/>
                                        </DialogContent>
                                    </Dialog>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">
                                        No flights awaiting debrief.
                                    </p>
                                </div>
                            )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="logbook" className="mt-6">
                {/* This tab is intentionally left empty as per the user's request. */}
            </TabsContent>
        </Tabs>
      </main>
  );
}
