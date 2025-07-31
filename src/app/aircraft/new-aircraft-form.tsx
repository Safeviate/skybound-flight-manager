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
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Aircraft make is required.'),
  model: z.string().min(1, 'Aircraft model is required.'),
  tailNumber: z.string().min(1, 'Aircraft registration is required.'),
  hours: z.coerce.number().min(0, 'Hobbs hours must be a positive number.'),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
  onSuccess: () => void;
  initialData?: Aircraft | null;
}

export function NewAircraftForm({ onSuccess, initialData }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: initialData || {
      make: '',
      model: '',
      tailNumber: '',
      hours: 0,
    },
  });

  async function handleFormSubmit(data: AircraftFormValues) {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    
    try {
        const newAircraft: Omit<Aircraft, 'id'> = {
            ...data,
            companyId: company.id,
            status: 'Available',
            nextServiceType: 'A-Check',
            hoursUntilService: 50, // Default for new aircraft
            airworthinessExpiry: new Date().toISOString(),
            insuranceExpiry: new Date().toISOString(),
            certificateOfReleaseToServiceExpiry: new Date().toISOString(),
            certificateOfRegistrationExpiry: new Date().toISOString(),
            massAndBalanceExpiry: new Date().toISOString(),
            radioStationLicenseExpiry: new Date().toISOString(),
            location: 'Default Base', // Placeholder
        };

        if (initialData) {
            // Update existing aircraft
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, initialData.id);
            await setDoc(aircraftRef, { ...initialData, ...data });
            toast({ title: 'Aircraft Updated', description: `${data.tailNumber} details saved.` });
        } else {
            // Add new aircraft
            await addDoc(collection(db, `companies/${company.id}/aircraft`), newAircraft);
            toast({ title: 'Aircraft Added', description: `${data.tailNumber} has been added to the fleet.` });
        }
        onSuccess();
    } catch (error) {
        console.error("Error saving aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save aircraft data.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
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
                <Input placeholder="e.g., ZS-ABC" {...field} />
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
              <FormLabel>Current Hobbs Hours</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2 flex justify-end pt-4">
          <Button type="submit">{initialData ? 'Save Changes' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>
  );
}
