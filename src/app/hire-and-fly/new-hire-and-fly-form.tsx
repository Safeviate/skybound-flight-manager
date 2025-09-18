
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useSettings } from '@/context/settings-provider';
import { createUserAndSendWelcomeEmail } from '../actions';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const pilotFormSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  email: z.string().email('A valid email is required.'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number.'),
});

type PilotFormValues = z.infer<typeof pilotFormSchema>;

interface NewHireAndFlyFormProps {
  onSuccess: () => void;
}

export function NewHireAndFlyForm({ onSuccess }: NewHireAndFlyFormProps) {
  const { company } = useUser();
  const { settings } = useSettings();
  const { toast } = useToast();

  const form = useForm<PilotFormValues>({
    resolver: zodResolver(pilotFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  async function handleFormSubmit(data: PilotFormValues) {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company selected.' });
      return;
    }

    const pilotData: Omit<User, 'id'> = {
      ...data,
      companyId: company.id,
      role: 'Hire and Fly',
      status: 'Active',
      permissions: ['Bookings:View'], // Minimal permissions
    };

    const result = await createUserAndSendWelcomeEmail(pilotData, company.id, company.name, settings.welcomeEmailEnabled);

    if (result.success) {
      toast({ title: 'Pilot Added', description: result.message });
      form.reset();
      onSuccess();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl><Input type="email" placeholder="pilot@example.com" {...field} /></FormControl>
              <FormDescription>A welcome email with login details will be sent.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl><Input placeholder="+27 12 345 6789" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit">Add Pilot</Button>
        </div>
      </form>
    </Form>
  );
}
