
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';
import { getNextService } from '@/lib/utils';
import { format } from 'date-fns';


const aircraftFormSchema = z.object({
  make: z.string().min(2, "Make is required."),
  model: z.string().min(1, "Model is required."),
  tailNumber: z.string().min(2, "Registration must be at least 2 characters."),
  hours: z.coerce.number().min(0, "Hours must be a positive number."),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
    onSuccess: () => void;
}

export function NewAircraftForm({ onSuccess }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      make: '',
      model: '',
      tailNumber: '',
      hours: 0,
    }
  });

  async function onSubmit(data: AircraftFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No company context found. Cannot add aircraft.' });
        return;
    }
    const id = data.tailNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const aircraftRef = doc(db, `companies/${company.id}/aircraft`, id);
    const nextService = getNextService(data.hours);

    const newAircraft: Omit<Aircraft, 'id'> = {
        companyId: company.id,
        make: data.make,
        model: data.model,
        tailNumber: data.tailNumber,
        hours: data.hours,
        status: 'Available',
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
        airworthinessExpiry: format(new Date(), 'yyyy-MM-dd'),
        insuranceExpiry: format(new Date(), 'yyyy-MM-dd'),
        certificateOfReleaseToServiceExpiry: format(new Date(), 'yyyy-MM-dd'),
        certificateOfRegistrationExpiry: format(new Date(), 'yyyy-MM-dd'),
        massAndBalanceExpiry: format(new Date(), 'yyyy-MM-dd'),
        radioStationLicenseExpiry: format(new Date(), 'yyyy-MM-dd'),
        location: 'KPAO', // Default
    };

    try {
        await setDoc(aircraftRef, { ...newAircraft, id });
        toast({ title: 'Aircraft Added', description: `Aircraft ${data.tailNumber} has been added.` });
        onSuccess();
    } catch (error) {
        console.error("Error adding aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add aircraft.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem><FormLabel>Aircraft Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Aircraft Model</FormLabel><FormControl><Input placeholder="e.g., 172 Skyhawk" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="tailNumber" render={({ field }) => (
                <FormItem><FormLabel>Aircraft Registration</FormLabel><FormControl><Input placeholder="e.g., N12345" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="hours" render={({ field }) => (
                <FormItem><FormLabel>Aircraft Hobbs</FormLabel><FormControl><Input type="number" step="0.1" placeholder="1250.5" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <div className="flex justify-end pt-4 border-t">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
