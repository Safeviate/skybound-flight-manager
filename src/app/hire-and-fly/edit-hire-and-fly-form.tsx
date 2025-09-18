
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { User } from '@/lib/types';
import { useEffect } from 'react';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const pilotFormSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  email: z.string().email('A valid email is required.'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number.'),
});

type PilotFormValues = z.infer<typeof pilotFormSchema>;

interface EditHireAndFlyFormProps {
  pilot: User;
  onUpdate: (data: User) => void;
}

export function EditHireAndFlyForm({ pilot, onUpdate }: EditHireAndFlyFormProps) {
  const form = useForm<PilotFormValues>({
    resolver: zodResolver(pilotFormSchema),
  });

  useEffect(() => {
    form.reset({
      name: pilot.name,
      email: pilot.email,
      phone: pilot.phone,
    });
  }, [pilot, form]);

  function handleFormSubmit(data: PilotFormValues) {
    const updatedPilot: User = {
      ...pilot,
      ...data,
    };
    onUpdate(updatedPilot);
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
              <FormControl><Input {...field} /></FormControl>
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
              <FormControl><Input type="email" {...field} /></FormControl>
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
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
