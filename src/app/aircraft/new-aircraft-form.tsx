
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Camera } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import type { Aircraft, Checklist } from '@/lib/types';
import { getNextService } from '@/lib/utils';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AiCameraReader } from './ai-camera-reader';
import { readHobbsFromImage } from '@/ai/flows/read-hobbs-from-image-flow';
import { readRegistrationFromImage } from '@/ai/flows/read-registration-from-image-flow';
import { ScrollArea } from '@/components/ui/scroll-area';

const aircraftFormSchema = z.object({
  tailNumber: z.string().min(2, "Registration must be at least 2 characters."),
  model: z.string().min(2, "Model must be at least 2 characters."),
  status: z.enum(['Available', 'In Maintenance', 'Booked'], { required_error: 'Please select a status.' }),
  hours: z.coerce.number().min(0, "Hours must be a positive number."),
  airworthinessExpiry: z.date().optional(),
  insuranceExpiry: z.date().optional(),
  certificateOfReleaseToServiceExpiry: z.date().optional(),
  certificateOfRegistrationExpiry: z.date().optional(),
  massAndBalanceExpiry: z.date().optional(),
  radioStationLicenseExpiry: z.date().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
    onAircraftAdded: () => void;
}

export function NewAircraftForm({ onAircraftAdded }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [isRegCameraOpen, setIsRegCameraOpen] = useState(false);
  const [isHobbsCameraOpen, setIsHobbsCameraOpen] = useState(false);
  
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      tailNumber: '',
      model: '',
      status: 'Available',
      hours: 0,
      airworthinessExpiry: undefined,
      insuranceExpiry: undefined,
      certificateOfReleaseToServiceExpiry: undefined,
      certificateOfRegistrationExpiry: undefined,
      massAndBalanceExpiry: undefined,
      radioStationLicenseExpiry: undefined,
    }
  });

  const assignStandardChecklists = async (aircraftId: string) => {
      if (!company) return;
      try {
          const templatesRef = collection(db, `companies/${company.id}/checklist-templates`);
          const templatesSnapshot = await getDocs(templatesRef);
          const standardTemplates = templatesSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Checklist))
              .filter(t => t.category === 'Pre-Flight' || t.category === 'Post-Flight');

          if (standardTemplates.length === 0) return;

          const assignedChecklistsRef = collection(db, `companies/${company.id}/checklists`);
          const batch = [];
          for (const template of standardTemplates) {
              const newChecklistForAircraft: Omit<Checklist, 'id'> = {
                  ...template,
                  aircraftId: aircraftId,
                  templateId: template.id,
              };
              batch.push(addDoc(assignedChecklistsRef, newChecklistForAircraft));
          }
          await Promise.all(batch);
      } catch (error) {
          console.error('Error assigning standard checklists:', error);
          toast({ variant: 'destructive', title: 'Checklist Assignment Failed', description: 'Could not automatically assign standard checklists.'});
      }
  };

  async function onSubmit(data: AircraftFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No company context found. Cannot add aircraft.' });
        return;
    }
    const id = data.tailNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const aircraftRef = doc(db, `companies/${company.id}/aircraft`, id);
    const nextService = getNextService(data.hours);

    const newAircraft: Aircraft = {
        ...data,
        id,
        companyId: company.id,
        airworthinessExpiry: data.airworthinessExpiry ? format(data.airworthinessExpiry, 'yyyy-MM-dd') : '',
        insuranceExpiry: data.insuranceExpiry ? format(data.insuranceExpiry, 'yyyy-MM-dd') : '',
        certificateOfReleaseToServiceExpiry: data.certificateOfReleaseToServiceExpiry ? format(data.certificateOfReleaseToServiceExpiry, 'yyyy-MM-dd') : '',
        certificateOfRegistrationExpiry: data.certificateOfRegistrationExpiry ? format(data.certificateOfRegistrationExpiry, 'yyyy-MM-dd') : '',
        massAndBalanceExpiry: data.massAndBalanceExpiry ? format(data.massAndBalanceExpiry, 'yyyy-MM-dd') : '',
        radioStationLicenseExpiry: data.radioStationLicenseExpiry ? format(data.radioStationLicenseExpiry, 'yyyy-MM-dd') : '',
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
        location: 'KPAO', // Default
    };

    try {
        await setDoc(aircraftRef, newAircraft);
        await assignStandardChecklists(id);
        toast({ title: 'Aircraft Added', description: `Aircraft ${data.tailNumber} has been added.` });
        onAircraftAdded();
    } catch (error) {
        console.error("Error adding aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add aircraft.' });
    }
  }

  const DatePickerField = ({ name, label }: { name: keyof AircraftFormValues, label: string }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                >
                  {field.value ? format(field.value, "PPP") : <span>Pick expiry date</span>}
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
  );

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[60vh] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField control={form.control} name="tailNumber" render={({ field }) => (
                <FormItem>
                <FormLabel>Tail Number</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="N12345" {...field} /></FormControl>
                    <Button variant="outline" type="button" size="icon" onClick={() => setIsRegCameraOpen(true)}><Camera className="h-4 w-4" /></Button>
                </div>
                <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Cessna 172" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Maintenance">In Maintenance</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                    </SelectContent>
                </Select><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="hours" render={({ field }) => (
                <FormItem><FormLabel>Hobbs Hours</FormLabel>
                 <div className="flex items-center gap-2">
                    <FormControl><Input type="number" step="0.1" placeholder="1250.5" {...field} /></FormControl>
                    <Button variant="outline" type="button" size="icon" onClick={() => setIsHobbsCameraOpen(true)}><Camera className="h-4 w-4" /></Button>
                 </div><FormMessage /></FormItem>
            )}/>
            <DatePickerField name="airworthinessExpiry" label="Airworthiness Expiry" />
            <DatePickerField name="insuranceExpiry" label="Insurance Expiry" />
            <DatePickerField name="certificateOfReleaseToServiceExpiry" label="CRS Expiry" />
            <DatePickerField name="certificateOfRegistrationExpiry" label="Registration Expiry" />
            <DatePickerField name="massAndBalanceExpiry" label="Mass & Balance Expiry" />
            <DatePickerField name="radioStationLicenseExpiry" label="Radio License Expiry" />
        </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
    <Dialog open={isRegCameraOpen} onOpenChange={setIsRegCameraOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Scan Tail Number</DialogTitle></DialogHeader>
            <AiCameraReader isOpen={isRegCameraOpen} aiFlow={readRegistrationFromImage} onValueRead={(value) => { form.setValue('tailNumber', String(value)); setIsRegCameraOpen(false); }} />
        </DialogContent>
    </Dialog>
    <Dialog open={isHobbsCameraOpen} onOpenChange={setIsHobbsCameraOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Scan Hobbs Meter</DialogTitle></DialogHeader>
            <AiCameraReader isOpen={isHobbsCameraOpen} aiFlow={readHobbsFromImage} onValueRead={(value) => { form.setValue('hours', Number(value)); setIsHobbsCameraOpen(false); }}/>
        </DialogContent>
    </Dialog>
    </>
  );
}
