

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail, Phone, User, Award, BookUser, Calendar as CalendarIcon, Edit, PlusCircle, UserCheck, Plane, BookOpen, Clock, Download, Archive, User as UserIcon, Book, Trash2, Search, ChevronLeft, ChevronRight, Wind, Users as UsersIcon, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Endorsement, TrainingLogEntry, Permission, User as StudentUser, Booking, Alert } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { AddEndorsementForm } from './add-endorsement-form';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { AddDebriefForm } from './add-debrief-entry-form';
import { AddLogbookEntryForm } from './add-logbook-entry-form';
import { useUser } from '@/context/user-provider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, writeBatch, getDocs, addDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { useSettings } from '@/context/settings-provider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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
    const [isDebriefOpen, setIsDebriefOpen] = useState(false);
    const [isLogbookEditOpen, setIsLogbookEditOpen] = useState(false);
    const [bookingForDebrief, setBookingForDebrief] = useState<Booking | null>(null);
    const [logToEdit, setLogToEdit] = useState<TrainingLogEntry | null>(null);
    
    const [hoursForward, setHoursForward] = useState({
        total: 0,
        se: 0,
        me: 0,
        dual: 0,
        single: 0,
        night: 0,
    });


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
        if (!student?.trainingLogs || !Array.isArray(student.trainingLogs)) {
            return [];
        }
        return [...student.trainingLogs].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
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
            const updatedStudentSnap = await getDoc(studentRef);
            if (updatedStudentSnap.exists()) {
                setStudent(updatedStudentSnap.data() as StudentUser);
            }
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
        const updatedEndorsements = [...(student?.endorsements || []), endorsementWithId];
        handleUpdate({ endorsements: updatedEndorsements });
    };

    const handleDebriefSubmit = async (newLogEntry: Omit<TrainingLogEntry, 'id'>, fromBookingId?: string, logIdToUpdate?: string) => {
        if (!company || !student) return;

        let updatedLogs = [...(student.trainingLogs || [])];
        const logId = logIdToUpdate || `log-${Date.now()}`;

        if (logIdToUpdate) {
            const index = updatedLogs.findIndex(log => log.id === logIdToUpdate);
            if (index !== -1) {
                updatedLogs[index] = { ...updatedLogs[index], ...newLogEntry, id: logId };
            } else {
                 updatedLogs.push({ ...newLogEntry, id: logId });
            }
        } else {
             updatedLogs.push({ ...newLogEntry, id: logId });
        }

        const newTotalHours = updatedLogs.reduce((total, log) => total + (log.flightDuration || 0), 0);
        
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
        
        const firestoreUpdate: Partial<StudentUser> = {
            trainingLogs: updatedLogs,
            flightHours: newTotalHours,
            milestoneNotificationsSent: arrayUnion(...newNotifications),
        };


        if (fromBookingId) {
            firestoreUpdate.pendingBookingIds = student?.pendingBookingIds?.filter(id => id !== fromBookingId) || [];
            setPendingBookings(prev => prev.filter(b => b.id !== fromBookingId));
        }

        await handleUpdate(firestoreUpdate);
        
        setIsDebriefOpen(false);
        setLogToEdit(null);
        setBookingForDebrief(null);

        toast({
            title: logIdToUpdate ? 'Debrief Updated' : 'Instructor Debrief Submitted',
            description: 'The training record has been successfully saved.',
        });
    };
    
    const handleLogbookUpdate = (newLogEntry: Omit<TrainingLogEntry, 'id' | 'trainingExercises'>, logIdToUpdate?: string) => {
        if (!student) return;
        
        let updatedLogs = [...(student.trainingLogs || [])];
        const logId = logIdToUpdate || `log-${Date.now()}`;

        if (logIdToUpdate) {
            const index = updatedLogs.findIndex(log => log.id === logIdToUpdate);
            if (index !== -1) {
                // Keep the existing exercises, just update the flight details
                const exercises = updatedLogs[index].trainingExercises;
                updatedLogs[index] = { ...newLogEntry, id: logId, trainingExercises: exercises };
            }
        } else {
             updatedLogs.push({ ...newLogEntry, id: logId, trainingExercises: [] });
        }
        
        const newTotalHours = updatedLogs.reduce((total, log) => total + (log.flightDuration || 0), 0);

        handleUpdate({
            trainingLogs: updatedLogs,
            flightHours: newTotalHours,
        });

        setIsLogbookEditOpen(false);
        setLogToEdit(null);
        toast({
            title: 'Logbook Updated',
            description: 'The logbook entry has been successfully updated.',
        });
    };

    const handleDebriefClick = (booking: Booking) => {
        if (!booking.pendingLogEntryId || !student?.trainingLogs) {
             toast({
                variant: 'destructive',
                title: 'Log Entry Not Found',
                description: 'Could not find the corresponding log entry for this debrief. Please add it manually.',
            });
            return;
        }

        const logToUpdate = student.trainingLogs.find(log => log.id === booking.pendingLogEntryId);

        if (logToUpdate) {
            setLogToEdit(logToUpdate);
            setBookingForDebrief(booking);
            setIsDebriefOpen(true);
        } else {
            toast({
                variant: 'destructive',
                title: 'Log Entry Not Found',
                description: `Could not find log entry with ID: ${booking.pendingLogEntryId}. Please add it manually.`,
            });
        }
    };

    const handleEditLogEntry = (log: TrainingLogEntry) => {
        setLogToEdit(log);
        setIsLogbookEditOpen(true);
    };
    
    const handleDeleteDebrief = async (booking: Booking) => {
        if (!company || !student || !booking.pendingLogEntryId) return;

        const batch = writeBatch(db);

        const studentRef = doc(db, `companies/${company.id}/students`, student.id);
        batch.update(studentRef, { pendingBookingIds: arrayRemove(booking.id) });

        const updatedLogs = student.trainingLogs?.filter(log => log.id !== booking.pendingLogEntryId);
        batch.update(studentRef, { trainingLogs: updatedLogs });

        try {
            await batch.commit();
            setPendingBookings(prev => prev.filter(b => b.id !== booking.id));
            setStudent(prev => prev ? ({ ...prev, trainingLogs: updatedLogs }) : null);
            toast({
                title: "Debrief Cleared",
                description: `The pending debrief for booking ${booking.bookingNumber} has been removed.`,
            });
        } catch (error) {
            console.error("Error clearing debrief:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not clear the pending debrief.",
            });
        }
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
                head: [['Date', 'Aircraft', 'Departure', 'Arrival', 'Duration', 'Instructor', 'Notes']],
                body: student.trainingLogs.map(log => [
                    log.date,
                    log.aircraft,
                    log.departure || 'N/A',
                    log.arrival || 'N/A',
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
            return '0.0';
        }
        return decimalHours.toFixed(1);
    };

    const MilestoneProgress = ({ currentHours }: { currentHours: number }) => {
        const milestones = [
            { name: '10 Hour Check', target: 10 },
            { name: '20 Hour Check', target: 20 },
            { name: '30 Hour Check', target: 30 },
        ];
    
        return (
            <div className="border-4 border-yellow-300 p-4 bg-yellow-50 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-300 px-3 py-0.5 text-sm font-semibold rounded-full text-yellow-800">Milestone Progress</div>
                <Card>
                    <CardHeader>
                        <CardTitle>Milestone Progress</CardTitle>
                        <CardDescription>Progress towards key flight hour milestones.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {milestones.map(milestone => {
                            const prevMilestone = milestone.target - 10;
                            const hoursInBlock = Math.max(0, currentHours - prevMilestone);
                            const progress = Math.min((hoursInBlock / 10) * 100, 100);
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
            </div>
        )
    };

    const handleAddNewLog = () => {
        setLogToEdit(null);
        setBookingForDebrief(null);
        setIsLogbookEditOpen(true);
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
            <Dialog open={isDebriefOpen} onOpenChange={setIsDebriefOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Instructor Debrief</DialogTitle>
                        <DialogDescription>
                            Record details of the training session for {student.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <AddDebriefForm 
                        student={student} 
                        onSubmit={handleDebriefSubmit} 
                        booking={bookingForDebrief || undefined} 
                        logToEdit={logToEdit}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={isLogbookEditOpen} onOpenChange={setIsLogbookEditOpen}>
                 <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Logbook Edit</DialogTitle>
                        <DialogDescription>
                            Correcting a historical logbook entry for {student.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <AddLogbookEntryForm
                         onSubmit={handleLogbookUpdate}
                         logToEdit={logToEdit}
                    />
                </DialogContent>
            </Dialog>

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
                                    <div className="border-4 border-green-500 p-4 rounded-lg relative">
                                        <div className="absolute -top-3 left-4 bg-background px-2 text-green-500 font-semibold text-sm">Pending Instructor Debriefs</div>
                                        <Card>
                                            <CardHeader>
                                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                                    <div className="space-y-1">
                                                        <CardTitle>Pending Instructor Debriefs</CardTitle>
                                                        <CardDescription>These flights require a logbook entry from the instructor.</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                            {pendingBookings.length > 0 ? (
                                                pendingBookings.map(booking => (
                                                    <div key={booking.id} className="w-full text-left p-3 border rounded-lg hover:bg-muted transition-colors flex justify-between items-center">
                                                        <div className="flex-1 text-left">
                                                            <div className="space-y-1">
                                                                <p className="font-semibold text-sm">{booking.bookingNumber}: Flight on {format(parseISO(booking.date), 'PPP')}</p>
                                                                <p className="text-xs text-muted-foreground">Aircraft: {booking.aircraft} | Instructor: {booking.instructor}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button size="sm" variant="secondary" onClick={() => handleDebriefClick(booking)}>Debrief Edit</Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="shrink-0">
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will remove the pending debrief and its draft log entry. This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteDebrief(booking)}>Yes, Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
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
                        </div>
                </TabsContent>
                <TabsContent value="logbook" className="mt-6">
                     <div className="max-w-[1200px] mx-auto">
                        <Card className="border-4 border-blue-500 p-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Detailed Logbook for {student.name}</CardTitle>
                                        <CardDescription>
                                            A comprehensive log of all flight activities.
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={handleAddNewLog}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Manual Entry
                                        </Button>
                                        <Button variant="outline" onClick={handleDownloadLogbook}><Download className="mr-2 h-4 w-4"/>Download PDF</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                        <div className="flex justify-between items-center border-2 border-red-500 p-2">
                                            <Input
                                                placeholder="Search logs by aircraft, instructor, or comments..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="max-w-sm"
                                            />
                                        </div>
                                        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                            <Table className="border-2 border-purple-500" style={{ tableLayout: 'fixed' }}>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '80px' }}>DATE</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '120px' }}>MAKE, MODEL</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '100px' }}>REGISTRATION</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '80px' }}>DEPARTURE</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '80px' }}>ARRIVAL</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '150px' }}>NAME(S) PIC</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '400px' }}>REMARKS</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>SE</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>ME</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>FSTD</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>Solo</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>Dual</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>Night</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '60px' }}>Day</TableHead>
                                                        <TableHead className="border-r border-green-500 text-center" style={{ width: '80px' }}>TOTAL TIME</TableHead>
                                                        <TableHead style={{ width: '80px' }} className="text-center">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedLogs.length > 0 ? (
                                                        paginatedLogs.map(log => (
                                                            <TableRow key={log.id}>
                                                                <TableCell className="border-r border-border">{format(parseISO(log.date), 'dd/MM/yy')}</TableCell>
                                                                <TableCell className="border-r border-border">{log.aircraft?.split(' ')[0]}</TableCell>
                                                                <TableCell className="border-r border-border">{log.aircraft?.split(' ')[1]}</TableCell>
                                                                <TableCell className="border-r border-border">{log.departure || 'N/A'}</TableCell>
                                                                <TableCell className="border-r border-border">{log.arrival || 'N/A'}</TableCell>
                                                                <TableCell className="border-r border-border">{log.instructorName}</TableCell>
                                                                <TableCell className="whitespace-pre-wrap border-r border-border">{log.remarks}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.singleEngineTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.multiEngineTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.fstdTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.singleTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.dualTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.nightTime)}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.flightDuration - (log.nightTime || 0))}</TableCell>
                                                                <TableCell className="border-r border-border">{formatDecimalTime(log.flightDuration)}</TableCell>
                                                                <TableCell>
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditLogEntry(log)}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={16} className="h-24 text-center">No logbook entries found.</TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                            <ScrollBar orientation="horizontal" />
                                        </ScrollArea>
                                        <div className="flex items-center justify-center space-x-2 border-2 border-green-500 p-2">
                                            <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="outline" size="sm">
                                                <ChevronLeft className="h-4 w-4" />
                                                Previous
                                            </Button>
                                            <span className="text-sm">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                            <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline" size="sm">
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                </div>
                            </CardContent>
                        </Card>
                     </div>
                </TabsContent>
            </Tabs>
      </main>
  );
}
