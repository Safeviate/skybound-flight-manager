
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { userData } from '@/lib/data-provider';
import { Mail, Phone, User, Award, BookUser, Calendar as CalendarIcon, Edit, PlusCircle, UserCheck, Plane, BookOpen, Clock, Download, Archive, User as UserIcon, Book } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Endorsement, TrainingLogEntry, Permission } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
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


export default function StudentProfilePage({ params }: { params: { id: string } }) {
    const student = userData.find(s => s.id === params.id);
    const { toast } = useToast();
    
    const [progress, setProgress] = useState(student?.progress || 0);
    
    const { user } = useUser();
    const userPermissions = user?.permissions || [];
    const canEdit = userPermissions.includes('Super User') || userPermissions.includes('Students:Edit');

    if (!student || student.role !== 'Student') {
        return (
            <div className="flex flex-col min-h-screen">
                <Header title="Student Profile" />
                <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                    <p>Student not found.</p>
                </main>
            </div>
        )
    }
    
    const handleProgressSave = () => {
        console.log(`Saving progress for ${student.name}: ${progress}%`);
        toast({
            title: "Progress Updated",
            description: `${student.name}'s training progress has been set to ${progress}%.`,
        });
    }

    const handleDownloadLogbook = () => {
        if (!student) return;
    
        const doc = new jsPDF();
        let startY = 54;
    
        // Title
        doc.setFontSize(20);
        doc.text("Student Training Log", 14, 22);
    
        // Student Info
        doc.setFontSize(12);
        doc.text(`Student: ${student.name}`, 14, 32);
        doc.text(`Instructor: ${student.instructor || 'N/A'}`, 14, 38);
        doc.text(`Total Hobbs Hours: ${student.flightHours?.toFixed(1) || 0}`, 14, 44);
    
        // Endorsements Table
        if (student.endorsements && student.endorsements.length > 0) {
            autoTable(doc, {
                startY: startY,
                head: [['Endorsement', 'Date Awarded', 'Awarded By']],
                body: student.endorsements.map(e => [e.name, e.dateAwarded, e.awardedBy]),
                headStyles: { fillColor: [34, 197, 94] }, // A green color
            });
            startY = (doc as any).lastAutoTable.finalY + 10;
        }
    
        // Training Log Table
        if (student.trainingLogs && student.trainingLogs.length > 0) {
             autoTable(doc, {
                startY: startY,
                head: [['Date', 'Aircraft', 'Duration (hrs)', 'Instructor', 'Notes']],
                body: student.trainingLogs.map(log => [
                    log.date,
                    log.aircraft,
                    log.flightDuration,
                    log.instructorName,
                    log.instructorNotes,
                ]),
                headStyles: { fillColor: [34, 197, 94] },
                columnStyles: {
                    4: { cellWidth: 'auto' },
                }
            });
        }
        
        const fileName = `${student.name.replace(/\s+/g, '_').toLowerCase()}_logbook.pdf`;
        doc.save(fileName);
    };

    const handleArchive = () => {
        toast({
            title: "Student Archived",
            description: `${student.name} has been moved to the archives.`,
        });
    }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Student Profile">
        {canEdit && (
            <Button variant="outline" onClick={handleArchive}>
                <Archive className="mr-2" />
                Archive Student
            </Button>
        )}
      </Header>
      <main className="flex-1 p-4 md:p-8 space-y-8">
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
                            <span className="font-medium">Flight Hours: {student.flightHours?.toFixed(1)}</span>
                        </div>
                        {student.medicalExpiry && (
                            <div className="flex items-center space-x-3">
                                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                                <span>Medical Exp: {getExpiryBadge(student.medicalExpiry)}</span>
                            </div>
                        )}
                        {student.licenseExpiry && (
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <span>License Exp: {getExpiryBadge(student.licenseExpiry)}</span>
                        </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Training Progress</CardTitle>
                        <CardDescription>Adjust the slider to update the student's overall progress.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="progress" className="font-bold text-2xl w-24">{progress}%</Label>
                            <Slider
                                id="progress"
                                min={0}
                                max={100}
                                step={1}
                                value={[progress]}
                                onValueChange={(value) => setProgress(value[0])}
                                disabled={!canEdit}
                            />
                        </div>
                         <Button onClick={handleProgressSave} className="w-full" disabled={!canEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Save Progress
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
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
                                    <AddEndorsementForm studentId={student.id} />
                                </DialogContent>
                            </Dialog>
                        )}
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
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Training Log</CardTitle>
                            <CardDescription>Total Hobbs: {student.flightHours?.toFixed(1) || 0} hrs</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button onClick={handleDownloadLogbook} variant="outline" className="w-full sm:w-auto">
                                <Download className="mr-2 h-4 w-4" />
                                Download Logbook
                            </Button>
                            {canEdit && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Add Log Entry
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Training Log Entry</DialogTitle>
                                            <DialogDescription>
                                                Record details of the training session for {student.name}.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <AddLogEntryForm studentId={student.id} />
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {student.trainingLogs && student.trainingLogs.length > 0 ? (
                            student.trainingLogs.map((log) => (
                                <div key={log.id} className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">{format(parseISO(log.date), 'MMMM d, yyyy')}</h4>
                                        <Badge variant="outline">{log.instructorName}</Badge>
                                    </div>
                                    <div className="flex items-center text-sm text-muted-foreground gap-4">
                                        <span className="flex items-center gap-1.5"><Plane className="h-4 w-4" /> {log.aircraft}</span>
                                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {log.flightDuration} hrs</span>
                                    </div>
                                    <p className="text-sm border-l-2 pl-4 py-2 bg-muted/50 rounded-r-lg">{log.instructorNotes}</p>
                                </div>
                            ))
                        ) : (
                             <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">
                                    No training logs have been added for this student.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}

    
