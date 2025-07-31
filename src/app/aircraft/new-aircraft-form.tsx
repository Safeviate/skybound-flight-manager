
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
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { Aircraft, User, Checklist, ChecklistItem } from '@/lib/types';
import { getNextService } from '@/lib/utils';
import { useEffect, useState } from 'react';


const aircraftFormSchema = z.object({
  tailNumber: z.string().min(2, {
    message: 'Registration must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  status: z.enum(['Available', 'In Maintenance', 'Booked'], {
      required_error: 'Please select a status.'
  }),
  hours: z.coerce.number().min(0, {
      message: "Hours must be a positive number.",
  }),
  airworthinessExpiry: z.date().optional(),
  insuranceExpiry: z.date().optional(),
  certificateOfReleaseToServiceExpiry: z.date().optional(),
  certificateOfRegistrationExpiry: z.date().optional(),
  massAndBalanceExpiry: z.date().optional(),
  radioStationLicenseExpiry: z.date().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
    onAircraftAdded: (newAircraft: Aircraft) => void;
}

export function NewAircraftForm({ onAircraftAdded }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
        status: 'Available',
    }
  });

  useEffect(() => {
    if (!company) return;

    const fetchUsers = async () => {
        const usersQuery = query(collection(db, `companies/${company.id}/users`));
        const usersSnapshot = await getDocs(usersQuery);
        setUsers(usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User)));
    };

    fetchUsers();
  }, [company]);

  const assignStandardChecklists = async (aircraftId: string) => {
      if (!company) return;
      
      try {
          // 1. Fetch all master templates
          const templatesRef = collection(db, `companies/${company.id}/checklist-templates`);
          const templatesSnapshot = await getDocs(templatesRef);
          const allTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));

          // 2. Filter for standard "Pre-Flight" and "Post-Flight" templates
          const standardTemplates = allTemplates.filter(t => 
              t.title.toLowerCase().includes('pre-flight') || 
              t.title.toLowerCase().includes('post-flight')
          );
          
          if (standardTemplates.length === 0) {
              toast({ variant: 'destructive', title: 'No Standard Templates Found', description: 'Could not find master "Pre-Flight" or "Post-Flight" checklists to assign.'});
              return;
          }

          // 3. Create and assign copies for the new aircraft
          const assignedChecklistsRef = collection(db, `companies/${company.id}/checklists`);
          for (const template of standardTemplates) {
              const newChecklistForAircraft: Omit<Checklist, 'id'> = {
                  ...template,
                  aircraftId: aircraftId,
                  templateId: template.id,
              };
              await addDoc(assignedChecklistsRef, newChecklistForAircraft);
          }
           toast({
              title: 'Standard Checklists Assigned',
              description: `Assigned ${standardTemplates.length} standard checklist(s) to the new aircraft.`
            });

      } catch (error) {
          console.error('Error assigning standard checklists:', error);
           toast({ variant: 'destructive', title: 'Checklist Assignment Failed', description: 'Could not automatically assign standard checklists.'});
      }
  };

  async function onSubmit(data: AircraftFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No company context found.' });
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
        location: 'KPAO', // Default location, can be changed later
    };

    try {
        await setDoc(aircraftRef, newAircraft);
        
        // Automatically assign standard checklists
        await assignStandardChecklists(id);

        onAircraftAdded(newAircraft);
        toast({
          title: 'Aircraft Added',
          description: `Aircraft ${data.tailNumber} has been added.`,
        });
        form.reset();
    } catch (error) {
        console.error("Error adding aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add aircraft to the database.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField
            control={form.control}
            name="tailNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tail Number</FormLabel>
                <FormControl>
                    <Input placeholder="N12345" {...field} />
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
                <FormLabel>Model</FormLabel>
                <FormControl>
                    <Input placeholder="Cessna 172 Skyhawk" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Maintenance">In Maintenance</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hobbs Hours</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="1250.5" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        
            <FormField
                control={form.control}
                name="airworthinessExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Airworthiness Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="insuranceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Insurance Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="certificateOfReleaseToServiceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Certificate of Release to Service Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="certificateOfRegistrationExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Certificate of Registration Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="massAndBalanceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mass and Balance Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="radioStationLicenseExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Radio Station License Expiry</FormLabel>
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
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick expiry date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="flex justify-end">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
