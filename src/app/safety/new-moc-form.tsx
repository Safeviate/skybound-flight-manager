
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ManagementOfChange } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, getCountFromServer, query } from 'firebase/firestore';
import { format } from 'date-fns';

const mocFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  reason: z.string().min(20, 'Reason for change must be at least 20 characters.'),
  scope: z.string().min(20, 'Scope of change must be at least 20 characters.'),
});

type MocFormValues = z.infer<typeof mocFormSchema>;

interface NewMocFormProps {
  onClose: () => void;
  onUpdate: () => void;
}

export function NewMocForm({ onClose, onUpdate }: NewMocFormProps) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const form = useForm<MocFormValues>({
    resolver: zodResolver(mocFormSchema),
    defaultValues: {
        title: '',
        description: '',
        reason: '',
        scope: '',
    }
  });

  async function handleFormSubmit(data: MocFormValues) {
    if (!user || !company) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to propose a change.' });
      return;
    }

    try {
      const mocCollection = collection(db, `companies/${company.id}/management-of-change`);
      const snapshot = await getCountFromServer(mocCollection);
      const nextId = snapshot.data().count + 1;
      const mocNumber = `MOC-${String(nextId).padStart(4, '0')}`;

      const newMoc: Omit<ManagementOfChange, 'id'> = {
        ...data,
        companyId: company.id,
        mocNumber: mocNumber,
        proposedBy: user.name,
        proposalDate: new Date().toISOString(),
        status: 'Proposed',
      };

      await addDoc(mocCollection, newMoc);
      toast({ title: 'Change Proposed', description: `Your proposal (${mocNumber}) has been submitted for review.` });
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Error submitting MOC:", error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not submit your proposal.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title of Change</FormLabel>
              <FormControl><Input placeholder="e.g., Introduction of new aircraft type" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description of Change</FormLabel>
              <FormControl><Textarea placeholder="Provide a detailed description of what is changing." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Change</FormLabel>
              <FormControl><Textarea placeholder="Explain why this change is necessary or beneficial." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope of Change</FormLabel>
              <FormControl><Textarea placeholder="Outline the departments, personnel, and operations affected by this change." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit">Submit Proposal</Button>
        </div>
      </form>
    </Form>
  );
}
