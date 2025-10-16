
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import type { Booking, TrainingLogEntry, User } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDecimalTime = (decimalHours: number | undefined) => {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours)) {
        return '0.0';
    }
    return decimalHours.toFixed(1);
};

export function MyProfilePageContent({
  user,
  bookings
}: {
  user: User;
  bookings: Booking[];
}) {

  const instructorLogbookEntries = useMemo(() => {
    return bookings
      .filter(booking => booking.status === 'Completed' && booking.instructor === user.name)
      .map(booking => {
          // This creates a log-like entry from the booking data.
          // In a real app, you might fetch the detailed student log for more info.
          return {
            id: booking.id,
            date: booking.date,
            aircraft: booking.aircraft,
            student: booking.student || 'N/A',
            flightDuration: booking.flightDuration || 0,
            startHobbs: booking.startHobbs || 0,
            endHobbs: booking.endHobbs || 0,
            trainingExercise: booking.trainingExercise || 'N/A',
          };
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [bookings, user.name]);

  const handleDownloadLogbook = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Instructor Logbook: ${user.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 22);

    const tableBody = instructorLogbookEntries.map(log => [
        format(parseISO(log.date), 'dd/MM/yyyy'),
        log.aircraft,
        log.student,
        log.trainingExercise,
        log.startHobbs.toFixed(1),
        log.endHobbs.toFixed(1),
        log.flightDuration.toFixed(1),
    ]);

    autoTable(doc, {
        startY: 30,
        head: [['Date', 'Aircraft', 'Student', 'Exercise', 'Start Hobbs', 'End Hobbs', 'Duration']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
    });
    
    doc.save(`${user.name.replace(/\s+/g, '_')}_instructor_logbook.pdf`);
  };
  
  return (
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Tabs defaultValue="profile">
        <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="logbook">Instructor Logbook</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
             <Card>
                <CardHeader>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.role}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Placeholder for more profile details */}
                    <p>Contact: {user.email} | {user.phone}</p>
                </CardContent>
             </Card>
        </TabsContent>
         <TabsContent value="logbook" className="mt-4">
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div>
                        <CardTitle>My Instructor Logbook</CardTitle>
                        <CardDescription>
                            A record of all completed instructional flights.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleDownloadLogbook}>
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Aircraft</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Exercise</TableHead>
                                    <TableHead>Start Hobbs</TableHead>
                                    <TableHead>End Hobbs</TableHead>
                                    <TableHead>Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {instructorLogbookEntries.length > 0 ? (
                                    instructorLogbookEntries.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{format(parseISO(log.date), 'PPP')}</TableCell>
                                            <TableCell>{log.aircraft}</TableCell>
                                            <TableCell>{log.student}</TableCell>
                                            <TableCell>{log.trainingExercise}</TableCell>
                                            <TableCell>{log.startHobbs.toFixed(1)}</TableCell>
                                            <TableCell>{log.endHobbs.toFixed(1)}</TableCell>
                                            <TableCell>{log.flightDuration.toFixed(1)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No completed instructional flights found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
