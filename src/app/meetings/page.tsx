
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Booking } from '@/lib/types';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function MeetingsPage() {
  const { company } = useUser();
  const { toast } = useToast();
  const [meetings, setMeetings] = React.useState<Booking[]>([]);

  React.useEffect(() => {
    const fetchMeetings = async () => {
      if (!company) return;
      try {
        const q = query(collection(db, `companies/${company.id}/facility-bookings`));
        const snapshot = await getDocs(q);
        setMeetings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (error) {
        console.error("Error fetching meetings:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load meeting data.' });
      }
    };
    fetchMeetings();
  }, [company, toast]);

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
          <CardDescription>View all scheduled facility bookings and their meeting minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Attendees</TableHead>
                <TableHead>Responsible Person</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.length > 0 ? (
                meetings.map(meeting => {
                   const allAttendees = [
                    ...(meeting.personnelAttendees || []),
                    ...(meeting.studentAttendees || []),
                    ...(meeting.externalAttendees || [])
                  ];

                  return (
                  <TableRow key={meeting.id}>
                    <TableCell>{format(parseISO(meeting.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{meeting.aircraft}</TableCell>
                    <TableCell>{meeting.title}</TableCell>
                     <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary">{allAttendees.length}</Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{allAttendees.join(', ')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{meeting.responsiblePerson}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/meetings/${meeting.id}`}>
                          <FileText className="mr-2 h-4 w-4" />
                          {meeting.meetingMinutes ? 'View/Edit Minutes' : 'Create Minutes'}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No meetings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

MeetingsPage.title = 'Meetings';
