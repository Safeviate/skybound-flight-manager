
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Bot } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { AircraftInfoScanner } from './aircraft-info-scanner';

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Aircraft make is required.'),
  model: z.string().min(1, 'Aircraft model is required.'),
  tailNumber: z.string().min(1, 'Aircraft registration is required.'),
  hours: z.coerce.number().min(0, 'Hobbs hours must be a positive number.'),
  airworthinessExpiry: z.date().optional(),
  insuranceExpiry: z.date().optional(),
  certificateOfReleaseToServiceExpiry: z.date().optional(),
  certificateOfRegistrationExpiry: z.date().optional(),
  massAndBalanceExpiry: z.date().optional(),
  radioStationLicenseExpiry: z.date().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
  onSuccess: () => void;
  initialData?: Aircraft | null;
}

const parseDate = (dateString?: string | null): Date | undefined => {
    return dateString ? parseISO(dateString) : undefined;
}

export function NewAircraftForm({ onSuccess, initialData }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'registration' | 'hobbs' | null>(null);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        airworthinessExpiry: parseDate(initialData.airworthinessExpiry),
        insuranceExpiry: parseDate(initialData.insuranceExpiry),
        certificateOfReleaseToServiceExpiry: parseDate(initialData.certificateOfReleaseToServiceExpiry),
        certificateOfRegistrationExpiry: parseDate(initialData.certificateOfRegistrationExpiry),
        massAndBalanceExpiry: parseDate(initialData.massAndBalanceExpiry),
        radioStationLicenseExpiry: parseDate(initialData.radioStationLicenseExpiry),
    } : {
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
    
    const aircraftDataToSave = {
        ...data,
        airworthinessExpiry: data.airworthinessExpiry ? data.airworthinessExpiry.toISOString() : new Date().toISOString(),
        insuranceExpiry: data.insuranceExpiry ? data.insuranceExpiry.toISOString() : new Date().toISOString(),
        certificateOfReleaseToServiceExpiry: data.certificateOfReleaseToServiceExpiry ? data.certificateOfReleaseToServiceExpiry.toISOString() : new Date().toISOString(),
        certificateOfRegistrationExpiry: data.certificateOfRegistrationExpiry ? data.certificateOfRegistrationExpiry.toISOString() : new Date().toISOString(),
        massAndBalanceExpiry: data.massAndBalanceExpiry ? data.massAndBalanceExpiry.toISOString() : new Date().toISOString(),
        radioStationLicenseExpiry: data.radioStationLicenseExpiry ? data.radioStationLicenseExpiry.toISOString() : new Date().toISOString(),
    };

    try {
        if (initialData) {
            // Update existing aircraft
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, initialData.id);
            await setDoc(aircraftRef, { ...initialData, ...aircraftDataToSave });
            toast({ title: 'Aircraft Updated', description: `${data.tailNumber} details saved.` });
        } else {
            // Add new aircraft
            const newAircraft: Omit<Aircraft, 'id'> = {
                ...aircraftDataToSave,
                companyId: company.id,
                status: 'Available',
                location: 'Default Base', // Placeholder
            };
            await addDoc(collection(db, `companies/${company.id}/aircraft`), newAircraft);
            toast({ title: 'Aircraft Added', description: `${data.tailNumber} has been added to the fleet.` });
        }
        onSuccess();
    } catch (error) {
        console.error("Error saving aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save aircraft data.' });
    }
  }
  
  const openScanner = (mode: 'registration' | 'hobbs') => {
    setScanMode(mode);
    setIsScannerOpen(true);
  }

  const handleScanSuccess = (data: { registration?: string; hobbs?: number }) => {
    if (data.registration) {
      form.setValue('tailNumber', data.registration);
    }
    if (data.hobbs !== undefined) {
      form.setValue('hours', data.hobbs);
    }
    setIsScannerOpen(false);
    toast({
      title: 'Scan Successful',
      description: 'The form has been updated with the scanned value.',
    });
  };

  const DatePickerField = ({ name, label }: { name: keyof AircraftFormValues, label: string }) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value as Date, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value as Date | undefined}
                onSelect={field.onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <>
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
              <div className="flex items-center gap-2">
                <FormControl>
                    <Input placeholder="e.g., ZS-ABC" {...field} />
                </FormControl>
                <Button type="button" variant="outline" size="icon" onClick={() => openScanner('registration')}>
                    <Bot className="h-4 w-4" />
                </Button>
              </div>
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
               <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <Button type="button" variant="outline" size="icon" onClick={() => openScanner('hobbs')}>
                        <Bot className="h-4 w-4" />
                    </Button>
                </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="md:col-span-2 pt-4 border-t">
          <h4 className="font-medium text-center mb-4">Document Expiry Dates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePickerField name="airworthinessExpiry" label="Certificate of Airworthiness" />
            <DatePickerField name="insuranceExpiry" label="Insurance" />
            <DatePickerField name="certificateOfReleaseToServiceExpiry" label="Certificate of Release to Service" />
            <DatePickerField name="certificateOfRegistrationExpiry" label="Certificate of Registration" />
            <DatePickerField name="massAndBalanceExpiry" label="Mass and Balance" />
            <DatePickerField name="radioStationLicenseExpiry" label="Radio Station License" />
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end items-center pt-4">
          <Button type="submit">{initialData ? 'Save Changes' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>

    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>AI Aircraft Scanner</DialogTitle>
                <DialogDescription>
                  {scanMode === 'registration' && 'Capture an image of the aircraft registration number.'}
                  {scanMode === 'hobbs' && 'Capture an image of the Hobbs meter.'}
                </DialogDescription>
            </DialogHeader>
            {scanMode && <AircraftInfoScanner scanMode={scanMode} onSuccess={handleScanSuccess} />}
        </DialogContent>
    </Dialog>
    </>
  );
}

    