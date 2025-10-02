
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function MeetingMinutesPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { company } = useUser();
  const { toast } = useToast();
  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [minutes, setMinutes] = React.useState('');

  React.useEffect(() => {
    const fetchBooking = async () => {
      if (!company || !bookingId) return;
      try {
        const docRef = doc(db, `companies/${company.id}/facility-bookings`, bookingId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const bookingData = { ...docSnap.data(), id: docSnap.id } as Booking;
          setBooking(bookingData);
          setMinutes(bookingData.meetingMinutes || '');
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Meeting not found.' });
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load meeting details.' });
      }
    };
    fetchBooking();
  }, [company, bookingId, toast]);

  const handleSave = async () => {
    if (!company || !booking) return;
    try {
      const docRef = doc(db, `companies/${company.id}/facility-bookings`, booking.id);
      await updateDoc(docRef, { meetingMinutes: minutes });
      toast({ title: 'Success', description: 'Meeting minutes saved.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save minutes.' });
    }
  };

  const handleDelete = async () => {
    if (!company || !booking) return;
    try {
      const docRef = doc(db, `companies/${company.id}/facility-bookings`, booking.id);
      await updateDoc(docRef, { meetingMinutes: '' });
      setMinutes('');
      toast({ title: 'Success', description: 'Meeting minutes have been deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete minutes.' });
    }
  };

  if (!booking) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <Button variant="outline" asChild>
                <Link href="/meetings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Meetings List
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Minutes
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete the minutes for this meeting. This cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Yes, delete minutes</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Minutes
                </Button>
            </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Meeting Minutes: {booking.title}</CardTitle>
            <CardDescription>
              {format(parseISO(booking.date), 'EEEE, MMMM d, yyyy')} | {booking.startTime} - {booking.endTime} | {booking.aircraft}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Start typing meeting minutes here..."
              className="min-h-[50vh]"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

MeetingMinutesPage.title = 'Meeting Minutes';
