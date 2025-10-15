
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, Booking, Facility } from '@/lib/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { MultiSelect } from '@/components/ui/multi-select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const facilityBookingSchema = z.object({
  title: z.string().min(3, 'A title for the event is required.'),
  date: z.string(),
  endDate: z.string().optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Please enter a valid time." }),
  responsiblePerson: z.string().min(1, 'Please select a responsible person.'),
  notes: z.string().optional(),
  studentAttendees: z.array(z.string()).optional(),
  personnelAttendees: z.array(z.string()).optional(),
  externalAttendees: z.string().optional(),
  bookingNumber: z.string().optional(),
});

type FacilityBookingFormValues = z.infer<typeof facilityBookingSchema>;

interface NewFacilityBookingFormProps {
  facility: Facility;
  users: User[];
  onSubmit: (data: Partial<Booking>) => void;
  onDelete?: (bookingId: string, reason: string) => void;
  startTime?: string;
  selectedDate?: Date;
  existingBooking?: Booking | null;
}

const deletionReasons = [
    'Maintenance',
    'Weather',
    'Congested Airspace',
    'No show - Pilot',
    'No show - Student',
    'Illness - Pilot',
    'Illness - Student',
    'Other',
];

export function NewFacilityBookingForm({ facility, users, onSubmit, onDelete, startTime, selectedDate, existingBooking }: NewFacilityBookingFormProps) {
  const form = useForm<FacilityBookingFormValues>({
    resolver: zodResolver(facilityBookingSchema),
    defaultValues: {
      startTime: startTime || '',
      endTime: '',
      notes: '',
      title: '',
      responsiblePerson: '',
      studentAttendees: [],
      personnelAttendees: [],
      externalAttendees: '',
    }
  });

  const [deleteReason, setDeleteReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  useEffect(() => {
    form.reset({
      date: existingBooking?.date || format(selectedDate || new Date(), 'yyyy-MM-dd'),
      endDate: existingBooking?.endDate || undefined,
      startTime: existingBooking?.startTime || startTime || '',
      endTime: existingBooking?.endTime || '',
      title: existingBooking?.title || '',
      responsiblePerson: existingBooking?.responsiblePerson || '',
      notes: existingBooking?.notes || '',
      studentAttendees: existingBooking?.studentAttendees || [],
      personnelAttendees: existingBooking?.personnelAttendees || [],
      externalAttendees: existingBooking?.externalAttendees?.join(', ') || '',
      bookingNumber: existingBooking?.bookingNumber || undefined,
    });
  }, [facility, startTime, selectedDate, form, existingBooking]);

  const personnel = useMemo(() => users.filter(u => u.role !== 'Student'), [users]);
  const students = useMemo(() => users.filter(u => u.role === 'Student'), [users]);

  const personnelOptions = useMemo(() => personnel.map(p => ({ value: p.name, label: p.name })), [personnel]);
  const studentOptions = useMemo(() => students.map(s => ({ value: s.name, label: s.name })), [students]);

  function handleFormSubmit(data: FacilityBookingFormValues) {
    const bookingData: Partial<Booking> = {
      purpose: 'Facility Booking',
      resourceType: 'facility',
      facilityId: facility.id,
      aircraft: facility.name, // Using aircraft field for display name
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      status: 'Approved',
      ...data,
      externalAttendees: data.externalAttendees?.split(',').map(s => s.trim()).filter(Boolean),
    };
    
    if (existingBooking) {
        onSubmit({ ...existingBooking, ...bookingData });
    } else {
        onSubmit(bookingData);
    }
  }
  
  const handleDeleteConfirm = () => {
    if (existingBooking && onDelete) {
        const finalReason = deleteReason === 'Other' ? `Other: ${otherReason}` : deleteReason;
        if (!finalReason) return;
        onDelete(existingBooking.id, finalReason);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PPL Ground School" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl><Input type="time" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="responsiblePerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsible Person</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Attendees</h4>
           <FormField
            control={form.control}
            name="personnelAttendees"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Personnel</FormLabel>
                    <MultiSelect
                        options={personnelOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select personnel..."
                    />
                    <FormMessage />
                </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="studentAttendees"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Students</FormLabel>
                    <MultiSelect
                        options={studentOptions}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder="Select students..."
                    />
                    <FormMessage />
                </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="externalAttendees"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>External Attendees</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Enter names, separated by commas" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any relevant notes for this booking..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-between items-center pt-4">
           {existingBooking && onDelete && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Cancel Booking
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reason for Cancellation</AlertDialogTitle>
                            <AlertDialogDescription>
                                Please select a reason for cancelling this booking. This information is used for reporting.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4 space-y-4">
                            <Select value={deleteReason} onValueChange={setDeleteReason}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {deletionReasons.map(reason => (
                                        <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {deleteReason === 'Other' && (
                                <div className="space-y-2">
                                    <Label htmlFor="other-reason">Please specify:</Label>
                                    <Textarea
                                        id="other-reason"
                                        value={otherReason}
                                        onChange={(e) => setOtherReason(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteConfirm} disabled={!deleteReason || (deleteReason === 'Other' && !otherReason)}>
                                Yes, Cancel Booking
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
           )}
           <div className={cn("flex-1 flex justify-end", !existingBooking && 'w-full')}>
                <Button type="submit">{existingBooking ? 'Save Changes' : 'Create Booking'}</Button>
           </div>
        </div>
      </form>
    </Form>
  );
}
