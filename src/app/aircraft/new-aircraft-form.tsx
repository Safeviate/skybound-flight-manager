
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const aircraftFormSchema = z.object({
  tailNumber: z.string().min(2, {
    message: 'Registration must be at least 2 characters.',
  }),
  aircraftType: z.string().min(2, {
    message: 'Aircraft type must be at least 2 characters.',
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
  airworthinessExpiry: z.date({
    required_error: 'An airworthiness expiry date is required.',
  }),
  insuranceExpiry: z.date({
    required_error: 'An insurance expiry date is required.',
  }),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

export function NewAircraftForm() {
  const { toast } = useToast();
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
        status: 'Available',
    }
  });

  function onSubmit(data: AircraftFormValues) {
    console.log({
        ...data,
        airworthinessExpiry: format(data.airworthinessExpiry, 'yyyy-MM-dd'),
        insuranceExpiry: format(data.insuranceExpiry, 'yyyy-MM-dd'),
    });
    toast({
      title: 'Aircraft Added',
      description: `Aircraft ${data.tailNumber} has been added to the fleet.`,
    });
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
                <FormLabel>Registration</FormLabel>
                <FormControl>
                    <Input placeholder="N12345" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="aircraftType"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Aircraft Type</FormLabel>
                <FormControl>
                    <Input placeholder="Single-Engine Piston" {...field} />
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Flight Hours</FormLabel>
                <FormControl>
                    <Input type="number" placeholder="1250.5" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="space-y-4 rounded-md border p-4">
                <h4 className="font-semibold">Airworthiness Certificate</h4>
                <div className="space-y-2">
                    <Label>Upload Certificate</Label>
                    <Input type="file" />
                </div>
                <FormField
                control={form.control}
                name="airworthinessExpiry"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
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
                                    <span>Pick a date</span>
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

            <div className="space-y-4 rounded-md border p-4 md:col-start-2">
                <h4 className="font-semibold">Insurance Policy</h4>
                <div className="space-y-2">
                    <Label>Upload Policy Document</Label>
                    <Input type="file" />
                </div>
                <FormField
                control={form.control}
                name="insuranceExpiry"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
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
                                    <span>Pick a date</span>
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
        </div>

        <div className="flex justify-end">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
