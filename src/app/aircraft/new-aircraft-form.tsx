
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
    console.log(data);
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
        </div>

        <div className="flex justify-end">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
