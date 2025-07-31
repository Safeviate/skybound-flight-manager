
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
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const aircraftFormSchema = z.object({
  make: z.string().min(2, { message: 'Aircraft make is required.' }),
  model: z.string().min(1, { message: 'Aircraft model is required.' }),
  tailNumber: z.string().min(2, { message: 'Registration is required.' }),
  hours: z.coerce.number().min(0, { message: 'Hobbs hours must be a positive number.' }),
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
  });

  async function onSubmit(data: AircraftFormValues) {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context found.' });
      return;
    }

    const newAircraftData: Omit<Aircraft, 'id' | 'companyId' | 'status' | 'location' | 'nextServiceType' | 'hoursUntilService' | 'airworthinessExpiry' | 'insuranceExpiry' | 'certificateOfReleaseToServiceExpiry' | 'certificateOfRegistrationExpiry' | 'massAndBalanceExpiry' | 'radioStationLicenseExpiry'> = {
        ...data,
        tailNumber: data.tailNumber.toUpperCase().replace(/\s+/g, ''),
    };

    try {
      const aircraftId = data.tailNumber.toUpperCase().replace(/\s+/g, '');
      const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraftId);
      
      const finalData: Omit<Aircraft, 'id'> = {
          ...newAircraftData,
          id: aircraftId,
          companyId: company.id,
          status: 'Available',
          location: 'KPAO', // Default location
          nextServiceType: 'A-Check',
          hoursUntilService: 50,
          airworthinessExpiry: '2025-12-31',
          insuranceExpiry: '2025-12-31',
          certificateOfReleaseToServiceExpiry: '2025-12-31',
          certificateOfRegistrationExpiry: '2025-12-31',
          massAndBalanceExpiry: '2025-12-31',
          radioStationLicenseExpiry: '2025-12-31'
      }

      await setDoc(aircraftRef, finalData);
      
      toast({
        title: 'Aircraft Added',
        description: `${data.make} ${data.model} has been added to the fleet.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error adding aircraft:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save aircraft.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="make"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft Make</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Cessna" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft Model</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 172 Skyhawk" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tailNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft Registration</FormLabel>
              <FormControl>
                <Input placeholder="e.g., N12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hours"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aircraft Hobbs</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="e.g., 1234.5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="col-span-2 flex justify-end">
          <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
