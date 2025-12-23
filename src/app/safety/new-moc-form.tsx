
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ManagementOfChange, User, CompanyDepartment, Alert } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, getCountFromServer, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


const mocFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  department: z.string().min(1, 'Department is required.'),
  proposedBy: z.string().min(1, 'Proposed by is required.'),
  proposalDate: z.date({ required_error: 'A proposal date is required.'}),
  description: z.string().min(20, 'Description must be at least 20 characters.'),
  reason: z.string().min(20, 'Reason for change must be at least 20 characters.'),
  scope: z.string().min(20, 'Scope of change must be at least 20 characters.'),
});

type MocFormValues = z.infer<typeof mocFormSchema>;

interface NewMocFormProps {
  onClose: () => void;
  onUpdate: () => void;
  personnel: User[];
  departments: CompanyDepartment[];
}

export function NewMocForm({ onClose, onUpdate, personnel, departments }: NewMocFormProps) {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const form = useForm<MocFormValues>({
    resolver: zodResolver(mocFormSchema),
    defaultValues: {
        title: '',
        department: '',
        proposedBy: '',
        proposalDate: new Date(),
        description: '',
        reason: '',
        scope: '',
    }
  });

  const filteredPersonnel = useMemo(() => {
    if (!selectedDepartment) return personnel;
    return personnel.filter(p => p.department === selectedDepartment);
  }, [selectedDepartment, personnel]);

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
        proposalDate: format(data.proposalDate, 'yyyy-MM-dd'),
        status: 'Proposed',
      };

      const docRef = await addDoc(mocCollection, newMoc);
      
      const proposer = personnel.find(p => p.name === data.proposedBy);
      if (proposer) {
        const newAlert: Omit<Alert, 'id' | 'number'> = {
            companyId: company.id,
            type: 'Signature Request',
            title: `MOC Signature Required: ${mocNumber}`,
            description: `Your signature is required on your proposal: "${data.title}"`,
            author: user.name,
            date: new Date().toISOString(),
            readBy: [],
            targetUserId: proposer.id,
            relatedLink: `/safety/moc/${docRef.id}`,
        };
        await addDoc(collection(db, `companies/${company.id}/alerts`), newAlert);
      }

      toast({ title: 'Change Proposed', description: `Your proposal (${mocNumber}) has been submitted and the proposer notified.` });
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedDepartment(value);
                  form.setValue('proposedBy', ''); // Reset proposer when department changes
                }} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {departments.map(dept => <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="proposedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proposed by</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDepartment}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredPersonnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
            control={form.control}
            name="proposalDate"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Proposal Date</FormLabel>
                     <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                    </Popover>
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
