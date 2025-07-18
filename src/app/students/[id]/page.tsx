
'use client';

import { useState } from 'react';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { studentData } from '@/lib/mock-data';
import { Mail, Phone, User, Award, BookUser, Calendar as CalendarIcon, Edit, PlusCircle, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Endorsement } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { AddEndorsementForm } from './add-endorsement-form';
import { getExpiryBadge } from '@/lib/utils.tsx';


export default function StudentProfilePage({ params }: { params: { id: string } }) {
    const student = studentData.find(s => s.id === params.id);
    const { toast } = useToast();
    
    // In a real app, this would be a state managed by a form library or state management tool.
    const [progress, setProgress] = useState(student?.progress || 0);

    if (!student) {
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
        // Here you would typically make an API call to save the progress.
        console.log(`Saving progress for ${student.name}: ${progress}%`);
        toast({
            title: "Progress Updated",
            description: `${student.name}'s training progress has been set to ${progress}%.`,
        });
    }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Student Profile" />
      <main className="flex-1 p-4 md:p-8 space-y-8">
        <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={`https://placehold.co/80x80.png`} alt={student.name} data-ai-hint="user avatar" />
                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-3xl">{student.name}</CardTitle>
                                <CardDescription className="mt-1">
                                    Student Pilot
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
                            <span className="font-medium">Flight Hours: {student.flightHours.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <span>Medical Exp: {getExpiryBadge(student.medicalExpiry)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            <span>License Exp: {getExpiryBadge(student.licenseExpiry)}</span>
                        </div>
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
                            />
                        </div>
                         <Button onClick={handleProgressSave} className="w-full">
                            <Edit className="mr-2 h-4 w-4" />
                            Save Progress
                        </Button>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Endorsements</CardTitle>
                            <CardDescription>Record of qualifications and completed training milestones.</CardDescription>
                        </div>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Endorsement
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
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Endorsement</TableHead>
                                <TableHead>Date Awarded</TableHead>
                                <TableHead>Awarded By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {student.endorsements.length > 0 ? student.endorsements.map((endorsement) => (
                                <TableRow key={endorsement.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Award className="h-4 w-4 text-accent"/>
                                        {endorsement.name}
                                    </TableCell>
                                    <TableCell>{format(parseISO(endorsement.dateAwarded), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{endorsement.awardedBy}</TableCell>
                                </TableRow>
                                )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No endorsements found for this student.
                                    </TableCell>
                                </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
