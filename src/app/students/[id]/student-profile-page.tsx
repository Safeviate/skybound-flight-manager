

'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail, Phone, User, Award, BookUser, Calendar as CalendarIcon, Edit, PlusCircle, UserCheck, Plane, BookOpen, Clock, Download, Archive, User as UserIcon, Book, Trash2, Search, ChevronLeft, ChevronRight, Wind, Users as UsersIcon, Save, Signature, ChevronDown, Eye } from 'lucide-react';
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
import { doc, updateDoc, arrayUnion, getDoc, collection, query, where, writeBatch, getDocs, addDoc, deleteDoc, arrayRemove, onSnapshot } from 'firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BroughtForwardHoursForm = ({ onSave, initialHours }: { onSave: (hours: any) => void, initialHours?: TrainingLogEntry | null }) => {
    const [hours, setHours] = useState({
        se: initialHours?.singleEngineTime?.toString() || '0',
        me: initialHours?.multiEngineTime?.toString() || '0',
        fstd: initialHours?.fstdTime?.toString() || '0',
        solo: initialHours?.singleTime?.toString() || '0',
        dual: initialHours?.dualTime?.toString() || '0',
        night: initialHours?.nightTime?.toString() || '0',
        day: initialHours?.dayTime?.toString() || '0',
        total: initialHours?.flightDuration?.toString() || '0',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setHours(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        const numericHours = Object.fromEntries(
            Object.entries(hours).map(([key, value]) => [key, parseFloat(value) || 0])
        );
        onSave(numericHours);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label htmlFor="se">SE</Label><Input id="se" name="se" type="number" step="0.1" value={hours.se} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="me">ME</Label><Input id="me" name="me" type="number" step="0.1" value={hours.me} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="fstd">FSTD</Label><Input id="fstd" name="fstd" type="number" step="0.1" value={hours.fstd} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="solo">Solo</Label><Input id="solo" name="solo" type="number" step="0.1" value={hours.solo} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="dual">Dual</Label><Input id="dual" name="dual" type="number" step="0.1" value={hours.dual} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="night">Night</Label><Input id="night" name="night" type="number" step="0.1" value={hours.night} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="day">Day</Label><Input id="day" name="day" type="number" step="0.1" value={hours.day} onChange={handleChange} /></div>
                <div className="space-y-2"><Label htmlFor="total">Total</Label><Input id="total" name="total" type="number" step="0.1" value={hours.total} onChange={handleChange} /></div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave}>{initialHours ? 'Save Changes' : 'Add Brought Forward Entry'}</Button>
            </DialogFooter>
        </div>
    );
};

export function StudentProfilePage({ initialStudent }: { initialStudent: StudentUser | null }) {
    const { user: currentUser, company, loading: userLoading } = useUser();
    const { settings } = useSettings();
    const { toast } = useToast();
    const router = useRouter();
    const [student, setStudent] = useState<StudentUser | null>(initialStudent);
    const [bookings, setBookings] = useState<Booking[]>([]);
    
    const [progress, setProgress] = useState(student?.progress || 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [isDebriefOpen, setIsDebriefOpen] = useState(false);
    const [isLogbookEditOpen, setIsLogbookEditOpen] = useState(false);
    const [bookingForDebrief, setBookingForDebrief] = useState<Booking | null>(null);
    const [logToEdit, setLogToEdit] = useState<TrainingLogEntry | null>(null);
    const [viewingLog, setViewingLog] = useState<TrainingLogEntry | null>(null);
    const [isBroughtForwardOpen, setIsBroughtForwardOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    
    const [hoursForward, setHoursForward] = useState({
        total: 0,
        se: 0,
        me: 0,
        dual: 0,
        single: 0,
        night: 0,
        day: 0,
    });


    useEffect(() => {
        setStudent(initialStudent);
        setProgress(initialStudent?.progress || 0);
    }, [initialStudent]);
    
    useEffect(() => {
        if (!userLoading && !currentUser) {
            router.push('/login');
        }
    }, [userLoading, currentUser, router]);

    useEffect(() => {
        if (!company || !student) return;
        
        const aircraftBookingsQuery = query(
            collection(db, `companies/${company.id}/aircraft-bookings`), 
            where('studentId', '==', student.id)
        );
        const facilityBookingsQuery = query(
            collection(db, `companies/${company.id}/facility-bookings`), 
            where('studentAttendees', 'array-contains', student.name)
        );

        const unsubAircraft = onSnapshot(aircraftBookingsQuery, (snapshot) => {
            const aircraftBookings = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
            setBookings(prev => [...aircraftBookings, ...prev.filter(b => b.resourceType === 'facility')]);
        });
        
        const unsubFacility = onSnapshot(facilityBookingsQuery, (snapshot) => {
            const facilityBookings = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
            setBookings(prev => [...facilityBookings, ...prev.filter(b => b.resourceType === 'aircraft')]);
        });

        return () => {
            unsubAircraft();
            unsubFacility();
        };
    }, [student, company]);
    
    const { pendingBookings, completedBookings } = useMemo(() => {
        if (!student) return { pendingBookings: [], completedBookings: [] };
        
        const pending = bookings.filter(b => 
            b.purpose === 'Training' &&
            b.status === 'Completed' &&
            !student.trainingLogs?.find(log => log.id === b.pendingLogEntryId)?.instructorSignature
        );
        const completed = bookings.filter(b => b.status === 'Completed' && !pending.some(p => p.id === b.id));
        
        return { pendingBookings: pending, completedBookings: completed };
    }, [bookings, student]);
    
    const canEdit = currentUser?.permissions.includes('Super User') || currentUser?.permissions.includes('Students:Edit');
    
    const sortedLogs = useMemo(() => {
        if (!student?.trainingLogs || !Array.isArray(student.trainingLogs)) {
            return [];
        }
        // Filter out brought forward logs for the main table
        const sortableLogs = [...student.trainingLogs]
            .filter(log => log.aircraft !== 'Previous Experience');

        sortableLogs.sort((a, b) => {
            const dateA = parseISO(a.date).getTime();
            const dateB = parseISO(b.date).getTime();
            if (sortOrder === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });
        return sortableLogs;
    }, [student?.trainingLogs, sortOrder]);

    const broughtForwardLog = useMemo(() => {
        return student?.trainingLogs?.find(log => log.aircraft === 'Previous Experience');
    }, [student?.trainingLogs]);
    
    const totalHoursLog = useMemo(() => {
        if (!student?.trainingLogs) return null;
        
        return student.trainingLogs.reduce((acc, log) => {
            acc.singleEngineTime += log.singleEngineTime || 0;
            acc.multiEngineTime += log.multiEngineTime || 0;
            acc.fstdTime += log.fstdTime || 0;
            acc.singleTime += log.singleTime || 0;
            acc.dualTime += log.dualTime || 0;
            acc.nightTime += log.nightTime || 0;
            acc.dayTime += log.dayTime || 0;
            acc.flightDuration += log.flightDuration || 0;
            return acc;
        }, {
            singleEngineTime: 0,
            multiEngineTime: 0,
            fstdTime: 0,
            singleTime: 0,
            dualTime: 0,
            nightTime: 0,
            dayTime: 0,
            flightDuration: 0,
        } as Omit<TrainingLogEntry, 'id' | 'date' | 'aircraft' | 'startHobbs' | 'endHobbs' | 'instructorName' | 'trainingExercises'>);
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

    const handleDebriefSubmit = async (newLogEntry: Omit<TrainingLogEntry, 'id'> & { studentSignatureRequired?: boolean }, fromBookingId?: string, logIdToUpdate?: string) => {
        if (!company || !student || !currentUser) return;
    
        const { studentSignatureRequired, ...logData } = newLogEntry;
    
        let updatedLogs = [...(student.trainingLogs || [])];
        const logId = logIdToUpdate || `log-${Date.now()}`;
    
        const existingLogIndex = updatedLogs.findIndex(log => log.id === logId);
        if (existingLogIndex !== -1) {
            updatedLogs[existingLogIndex] = { ...updatedLogs[existingLogIndex], ...logData, id: logId, studentSignatureRequired };
        } else {
            updatedLogs.push({ ...logData, id: logId, studentSignatureRequired });
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

                const instructorQuery = query(collection(db, `companies/${company.id}/users`), where('name', '==', student.instructor));
                const instructorSnapshot = await getDocs(instructorQuery);
                const instructor = instructorSnapshot.empty ? null : { ...instructorSnapshot.docs[0].data(), id: instructorSnapshot.docs[0].id } as StudentUser;
    
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
        };
        if (newNotifications.length > 0) {
            firestoreUpdate.milestoneNotificationsSent = arrayUnion(...newNotifications);
        }

        if (studentSignatureRequired) {
            const newAlert: Omit<Alert, 'id'|'number'> = {
                companyId: company.id,
                type: 'Signature Request',
                title: `Debrief Signature Required`,
                description: `Please review and sign the logbook entry for your flight on ${logData.date}.`,
                author: currentUser.name,
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: student.id,
                relatedLink: `/students/${student.id}?tab=logbook`,
            };
            await addDoc(collection(db, `companies/${company.id}/alerts`), newAlert);
            toast({ title: 'Student Notified', description: 'An alert has been sent to the student to request their signature.' });
        }
        
        await handleUpdate(firestoreUpdate);

        if (fromBookingId) {
            const booking = bookings.find(b => b.id === fromBookingId);
            if (booking) {
                const collectionName = booking.resourceType === 'aircraft' ? 'aircraft-bookings' : 'facility-bookings';
                const bookingRef = doc(db, `companies/${company.id}/${collectionName}`, fromBookingId);
                await updateDoc(bookingRef, { status: 'Completed' });
            }
        }
        
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
        
        handleUpdate({
            trainingLogs: updatedLogs,
        });

        setIsLogbookEditOpen(false);
        setLogToEdit(null);
        toast({
            title: 'Logbook Updated',
            description: 'The logbook entry has been successfully updated.',
        });
    };

    const handleDebriefClick = async (booking: Booking) => {
        if (!student?.trainingLogs || !company) return;
        
        const logToUpdate = student.trainingLogs.find(log => log.id === booking.pendingLogEntryId);
    
        if (logToUpdate) {
            setLogToEdit(logToUpdate);
            setBookingForDebrief(booking);
            setIsDebriefOpen(true);
        } else {
            const tempLogEntry: TrainingLogEntry = {
                id: booking.pendingLogEntryId || `temp-log-${Date.now()}`,
                date: booking.date,
                aircraft: booking.aircraft,
                startHobbs: booking.startHobbs || 0,
                endHobbs: booking.endHobbs || 0,
                flightDuration: booking.flightDuration || 0,
                instructorName: booking.instructor || '',
                trainingExercises: [],
            };
            setLogToEdit(tempLogEntry);
            setBookingForDebrief(booking);
            setIsDebriefOpen(true);
            toast({
                variant: "default",
                title: "Draft Log Created",
                description: `A draft log was created from the booking as the original couldn't be found. Please verify the details.`
            });
        }
    };
    
    const handleManualDebriefClick = () => {
        setLogToEdit(null);
        setBookingForDebrief(null);
        setIsDebriefOpen(true);
    };

    const handleEditLogEntry = (log: TrainingLogEntry) => {
        setLogToEdit(log);
        setIsLogbookEditOpen(true);
    };

    const handleDeleteLogEntry = (logIdToDelete: string) => {
        if (!student) return;
        const updatedLogs = student.trainingLogs?.filter(log => log.id !== logIdToDelete);
        
        handleUpdate({
            trainingLogs: updatedLogs,
        });
        
        setIsLogbookEditOpen(false);
        setLogToEdit(null);
        toast({
            title: 'Log Entry Deleted',
            description: 'The logbook entry has been successfully removed.',
        });
    };
    
    const handleDeleteDebrief = async (booking: Booking) => {
        if (!company || !student) return;

        const logIdToDelete = booking.pendingLogEntryId;

        const studentRef = doc(db, `companies/${company.id}/students`, student.id);
    
        const updatedLogs = logIdToDelete
            ? student.trainingLogs?.filter(log => log.id !== logIdToDelete)
            : student.trainingLogs;
    
        try {
            await updateDoc(studentRef, { trainingLogs: updatedLogs || [] });
            
            setStudent(prevStudent => {
                if (!prevStudent) return null;
                return {
                    ...prevStudent,
                    trainingLogs: updatedLogs,
                };
            });
            
            toast({
                title: "Debrief Cleared",
                description: `The draft log entry for booking ${booking.bookingNumber} has been removed.`,
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

    const getBookingForLog = (logId: string) => {
        return bookings.find(b => b.pendingLogEntryId === logId);
    };


    const handleDownloadLogbook = () => {
        if (!student) return;
    
        const doc = new jsPDF({
            orientation: 'landscape',
        });
    
        doc.setFontSize(16);
        doc.text("Student Training Logbook", 14, 15);
        doc.setFontSize(10);
        doc.text(`Student: ${student.name}`, 14, 22);
    
        let yPos = 28;
    
        const summaryHeaders = ['SE', 'ME', 'FSTD', 'SOLO', 'DUAL', 'NIGHT', 'DAY', 'TIME'];
    
        if (broughtForwardLog) {
            doc.setFontSize(12);
            doc.text("Hours Brought Forward", 14, yPos);
            yPos += 5;
            const bfData = [[
                formatDecimalTime(broughtForwardLog.singleEngineTime),
                formatDecimalTime(broughtForwardLog.multiEngineTime),
                formatDecimalTime(broughtForwardLog.fstdTime),
                formatDecimalTime(broughtForwardLog.singleTime),
                formatDecimalTime(broughtForwardLog.dualTime),
                formatDecimalTime(broughtForwardLog.nightTime),
                formatDecimalTime(broughtForwardLog.dayTime),
                formatDecimalTime(broughtForwardLog.flightDuration),
            ]];
            autoTable(doc, {
                startY: yPos,
                head: [summaryHeaders],
                body: bfData,
                theme: 'grid',
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    
        if (totalHoursLog) {
            doc.setFontSize(12);
            doc.text("Total Hours Logged", 14, yPos);
            yPos += 5;
            const totalData = [[
                formatDecimalTime(totalHoursLog.singleEngineTime),
                formatDecimalTime(totalHoursLog.multiEngineTime),
                formatDecimalTime(totalHoursLog.fstdTime),
                formatDecimalTime(totalHoursLog.singleTime),
                formatDecimalTime(totalHoursLog.dualTime),
                formatDecimalTime(totalHoursLog.nightTime),
                formatDecimalTime(totalHoursLog.dayTime),
                formatDecimalTime(totalHoursLog.flightDuration),
            ]];
            autoTable(doc, {
                startY: yPos,
                head: [summaryHeaders],
                body: totalData,
                theme: 'grid',
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    
        doc.setFontSize(12);
        doc.text("Logbook Entries", 14, yPos);
        yPos += 5;
    
        const tableBody = sortedLogs.map(log => {
            const aircraftString = log.aircraft || '';
            const make = log.make || '';
            const reg = aircraftString.replace(make, '').trim();

            const booking = getBookingForLog(log.id);
            const bookingNumRemark = booking?.bookingNumber ? `Booking: ${booking.bookingNumber}\n` : '';

            return [
                format(parseISO(log.date), 'dd/MM/yy'),
                log.make || 'N/A',
                reg || 'N/A',
                log.departure || 'N/A',
                log.arrival || 'N/A',
                log.instructorName || '',
                `${bookingNumRemark}${log.remarks || ''}`,
                formatDecimalTime(log.singleEngineTime),
                formatDecimalTime(log.multiEngineTime),
                formatDecimalTime(log.fstdTime),
                formatDecimalTime(log.singleTime),
                formatDecimalTime(log.dualTime),
                formatDecimalTime(log.nightTime),
                formatDecimalTime(log.dayTime),
                formatDecimalTime(log.flightDuration),
            ];
        });
    
        const tableHeaders = [
            'DATE', 'MAKE & MODEL', 'REG', 'DEPART', 'ARRIVE', 'PIC/INSTR', 'REMARKS',
            ...summaryHeaders
        ];
    
        autoTable(doc, {
            startY: yPos,
            head: [tableHeaders],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [22, 163, 74] },
            columnStyles: {
                0: { cellWidth: 16 }, 1: { cellWidth: 20 }, 2: { cellWidth: 20 },
                3: { cellWidth: 15 }, 4: { cellWidth: 15 }, 5: { cellWidth: 25 },
                6: { cellWidth: 40 },
                7: { cellWidth: 10, halign: 'center' }, 8: { cellWidth: 10, halign: 'center' },
                9: { cellWidth: 12, halign: 'center' }, 10: { cellWidth: 12, halign: 'center' },
                11: { cellWidth: 12, halign: 'center' }, 12: { cellWidth: 12, halign: 'center' },
                13: { cellWidth: 12, halign: 'center' }, 14: { cellWidth: 12, halign: 'center' },
            },
            didParseCell: function(data) {
                if (data.column.index === 6) {
                    data.cell.styles.cellWidth = 'wrap';
                }
            }
        });
    
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
        )
    };

    const handleAddNewLog = () => {
        setLogToEdit(null);
        setBookingForDebrief(null);
        setIsLogbookEditOpen(true);
    };

    const handleBroughtForwardSave = (hours: { total: number; se: number; me: number; fstd: number; solo: number; dual: number; night: number; day: number; }) => {
        if (!student) return;

        const newEntry: Omit<TrainingLogEntry, 'id'> = {
            date: format(new Date(), 'yyyy-MM-dd'),
            aircraft: 'Previous Experience',
            startHobbs: 0,
            endHobbs: hours.total,
            flightDuration: hours.total,
            instructorName: 'Brought Forward',
            trainingExercises: [],
            remarks: 'Hours brought forward from previous logbook.',
            singleEngineTime: hours.se,
            multiEngineTime: hours.me,
            fstdTime: hours.fstd,
            singleTime: hours.solo,
            dualTime: hours.dual,
            nightTime: hours.night,
            dayTime: hours.day,
        };

        const existingBfIndex = student.trainingLogs?.findIndex(log => log.aircraft === 'Previous Experience');
        let updatedLogs = [...(student.trainingLogs || [])];
        
        if (existingBfIndex !== undefined && existingBfIndex > -1) {
            // Update existing entry
            const logId = updatedLogs[existingBfIndex].id;
            updatedLogs[existingBfIndex] = { ...newEntry, id: logId };
        } else {
            // Add new entry
            updatedLogs.push({ ...newEntry, id: `bf-${Date.now()}` });
        }
        
        handleUpdate({
            trainingLogs: updatedLogs,
        });
        
        setIsBroughtForwardOpen(false);
        toast({
            title: 'Brought Forward Hours Saved',
            description: 'The previous flight hours have been saved.'
        });
    };

    const TotalTimeCard = ({ title, log, onEdit, isTotal }: { title: string, log?: Partial<TrainingLogEntry> | null, onEdit: () => void, isTotal?: boolean }) => {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>
                         {isTotal 
                            ? "A live summary of all hours recorded in this logbook." 
                            : "A summary of hours carried over from a previous logbook."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {log ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
                            <div><p className="text-xs text-muted-foreground">SE</p><p className="font-bold">{formatDecimalTime(log.singleEngineTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">ME</p><p className="font-bold">{formatDecimalTime(log.multiEngineTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">FSTD</p><p className="font-bold">{formatDecimalTime(log.fstdTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Solo</p><p className="font-bold">{formatDecimalTime(log.singleTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Dual</p><p className="font-bold">{formatDecimalTime(log.dualTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Night</p><p className="font-bold">{formatDecimalTime(log.nightTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Day</p><p className="font-bold">{formatDecimalTime(log.dayTime)}</p></div>
                            <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold">{formatDecimalTime(log.flightDuration)}</p></div>
                        </div>
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">No summary data available.</p>
                    )}
                </CardContent>
                {canEdit && !isTotal && (
                     <CardFooter>
                        <Button variant="outline" size="sm" onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            {log ? `Edit ${title}` : `Add ${title}`}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        );
    };

    if (userLoading) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>Loading student profile...</p></main>
        )
    }

    if (!student || !currentUser) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center"><p>Student not found.</p></main>
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
                         onDelete={handleDeleteLogEntry}
                    />
                </DialogContent>
            </Dialog>
            
            <Dialog open={viewingLog !== null} onOpenChange={() => setViewingLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Logbook Entry Details</DialogTitle>
                        <DialogDescription>Flight on {viewingLog && format(parseISO(viewingLog.date), 'PPP')}</DialogDescription>
                    </DialogHeader>
                    {viewingLog && (
                         <ScrollArea className="max-h-[70vh] pr-4">
                            <div className="p-4 space-y-4 bg-muted/50 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-sm">Remarks</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(getBookingForLog(viewingLog.id)?.bookingNumber ? `Booking: ${getBookingForLog(viewingLog.id)?.bookingNumber}\n` : '')}{viewingLog.remarks || 'No remarks.'}</p>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Debrief & Exercises</h4>
                                    {viewingLog.trainingExercises.map((ex, i) => (
                                        <div key={i} className="text-sm mb-2 border-b pb-2">
                                            <div className="flex justify-between items-center">
                                                <p className="font-medium">{ex.exercise}</p>
                                                <Badge variant="outline">Rating: {ex.rating}/4</Badge>
                                            </div>
                                            {ex.comment && <p className="text-xs text-muted-foreground mt-1 pl-2 border-l-2">{ex.comment}</p>}
                                        </div>
                                    ))}
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold text-sm mb-2">Signatures</h4>
                                    <div className="flex gap-4">
                                        {viewingLog.instructorSignature && <Image src={viewingLog.instructorSignature} alt="Instructor Signature" width={150} height={75} className="rounded-md border bg-white" />}
                                        {viewingLog.studentSignature && <Image src={viewingLog.studentSignature} alt="Student Signature" width={150} height={75} className="rounded-md border bg-white" />}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>


             <Dialog open={isBroughtForwardOpen} onOpenChange={setIsBroughtForwardOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Hours Brought Forward</DialogTitle>
                        <DialogDescription>
                            Enter the total hours from a previous logbook. This will create or update a single summary entry.
                        </DialogDescription>
                    </DialogHeader>
                    <BroughtForwardHoursForm onSave={handleBroughtForwardSave} initialHours={broughtForwardLog} />
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
                                            <span className="font-medium">Total Flight Hours: {student.flightHours?.toFixed(1) || '0.0'}</span>
                                        </div>
                                        
                                        {(student.documents || []).map((doc, index) => (
                                            <div key={`${doc.id}-${index}`} className="flex items-center space-x-3">
                                                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                                <span>{doc.type}: {getExpiryBadge(doc.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                    {student.licenseType !== 'PPL' && <MilestoneProgress currentHours={student.flightHours || 0} />}

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
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                            <div className="space-y-1">
                                                <CardTitle>Pending Instructor Debriefs</CardTitle>
                                                <CardDescription>These flights require a logbook entry from the instructor.</CardDescription>
                                            </div>
                                             {canEdit && (
                                                <Button variant="outline" size="sm" onClick={handleManualDebriefClick}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Manual Debrief
                                                </Button>
                                            )}
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
                                                    <Button size="sm" variant="secondary" onClick={() => handleDebriefClick(booking)}>Debrief</Button>
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
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Completed Instructor Debriefs</CardTitle>
                                        <CardDescription>A history of all completed training sessions.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                    {completedBookings.length > 0 ? (
                                        completedBookings.map(booking => (
                                            <div key={booking.id} className="w-full text-left p-3 border rounded-lg flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-sm">{booking.bookingNumber}: Flight on {format(parseISO(booking.date), 'PPP')}</p>
                                                    <p className="text-xs text-muted-foreground">Aircraft: {booking.aircraft} | Instructor: {booking.instructor} | Duration: {booking.flightDuration} hrs</p>
                                                </div>
                                                <Button size="sm" variant="outline" onClick={() => handleDebriefClick(booking)}>View</Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                                            <p className="text-muted-foreground">No completed debriefs found.</p>
                                        </div>
                                    )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                </TabsContent>
                <TabsContent value="logbook" className="mt-6">
                     <div className="max-w-[1200px] mx-auto space-y-6">
                        <TotalTimeCard title="Hours Brought Forward" log={broughtForwardLog} onEdit={() => setIsBroughtForwardOpen(true)} />
                        <TotalTimeCard title="Total Hours" log={totalHoursLog} onEdit={() => {}} isTotal={true} />
                        <Card>
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Detailed Logbook for {student.name}</CardTitle>
                                        <CardDescription>
                                            A comprehensive log of all flight activities.
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                         <Button variant="outline" size="sm" onClick={() => setIsBroughtForwardOpen(true)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            {broughtForwardLog ? 'Edit Hours Brought Forward' : 'Add Hours Brought Forward'}
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" onClick={handleAddNewLog}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Manual Entry
                                            </Button>
                                            <Button variant="outline" onClick={handleDownloadLogbook} data-nosnippet><Download className="mr-2 h-4 w-4"/>Download PDF</Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                        <div className="flex justify-between items-center p-2">
                                            <Input
                                                placeholder="Search logs by aircraft, instructor, or comments..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="max-w-sm"
                                            />
                                        </div>
                                        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>DATE</TableHead>
                                                        <TableHead>MAKE & MODEL</TableHead>
                                                        <TableHead>REG</TableHead>
                                                        <TableHead>DEPART</TableHead>
                                                        <TableHead>ARRIVE</TableHead>
                                                        <TableHead>PIC/INSTR</TableHead>
                                                        <TableHead>REMARKS</TableHead>
                                                        <TableHead>SE</TableHead>
                                                        <TableHead>ME</TableHead>
                                                        <TableHead>FSTD</TableHead>
                                                        <TableHead>SOLO</TableHead>
                                                        <TableHead>DUAL</TableHead>
                                                        <TableHead>NIGHT</TableHead>
                                                        <TableHead>DAY</TableHead>
                                                        <TableHead>TIME</TableHead>
                                                        <TableHead className="text-center align-middle">ACTIONS</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedLogs.length > 0 ? (
                                                        paginatedLogs.map(log => (
                                                            <TableRow key={log.id}>
                                                                <TableCell>{format(parseISO(log.date), 'dd/MM/yy')}</TableCell>
                                                                <TableCell>{log.make || 'N/A'}</TableCell>
                                                                <TableCell>{log.aircraft.replace(log.make || '', '').trim()}</TableCell>
                                                                <TableCell>{log.departure || 'N/A'}</TableCell>
                                                                <TableCell>{log.arrival || 'N/A'}</TableCell>
                                                                <TableCell>{log.instructorName}</TableCell>
                                                                <TableCell className="max-w-[200px] truncate">{log.remarks || ''}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.singleEngineTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.multiEngineTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.fstdTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.singleTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.dualTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.nightTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.dayTime)}</TableCell>
                                                                <TableCell>{formatDecimalTime(log.flightDuration)}</TableCell>
                                                                <TableCell>
                                                                    <div className="flex justify-center gap-1">
                                                                        <Button variant="ghost" size="icon" onClick={() => setViewingLog(log)}>
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" onClick={() => handleEditLogEntry(log)}>
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
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
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="sort-order" className="text-sm">Sort by:</Label>
                                                <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="newest">Newest to Oldest</SelectItem>
                                                        <SelectItem value="oldest">Oldest to Newest</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center justify-center space-x-2">
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
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
      </main>
  );
}
