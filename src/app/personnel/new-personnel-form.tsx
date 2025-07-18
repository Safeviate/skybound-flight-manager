
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
import { PermissionsForm } from './permissions-form';
import type { Role } from '@/lib/types';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/types';
import React from 'react';

const personnelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  role: z.enum(['Accountable Manager', 'Admin', 'Aircraft Manager', 'Chief Flight Instructor', 'Driver', 'Front Office', 'Head Of Training', 'HR Manager', 'Instructor', 'Maintenance', 'Operations Manager', 'Quality Manager', 'Safety Manager', 'Student'], {
      required_error: 'Please select a role.'
  }),
  department: z.string({
    required_error: 'Please select a department.'
  }),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one permission.',
  }),
  email: z.string().email({ message: "Please enter a valid email."}),
  phone: z.string().min(10, { message: "Please enter a valid phone number."}),
  documentType: z.string({ required_error: 'Please select a document type.' }),
  documentExpiry: z.date({ required_error: 'An expiry date is required.' }),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

export function NewPersonnelForm() {
  const { toast } = useToast();
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      permissions: [],
    }
  });

  const selectedRole = form.watch('role');

  React.useEffect(() => {
    if (selectedRole) {
      const permissionsForRole = ROLE_PERMISSIONS[selectedRole] || [];
      form.setValue('permissions', permissionsForRole);
    }
  }, [selectedRole, form]);

  function onSubmit(data: PersonnelFormValues) {
    console.log(data);
    toast({
      title: 'Personnel Added',
      description: `${data.name} has been added to the roster.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Accountable Manager">Accountable Manager</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Aircraft Manager">Aircraft Manager</SelectItem>
                        <SelectItem value="Chief Flight Instructor">Chief Flight Instructor</SelectItem>
                        <SelectItem value="Driver">Driver</SelectItem>
                        <SelectItem value="Front Office">Front Office</SelectItem>
                        <SelectItem value="Head Of Training">Head Of Training</SelectItem>
                        <SelectItem value="HR Manager">HR Manager</SelectItem>
                        <SelectItem value="Instructor">Instructor</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                        <SelectItem value="Quality Manager">Quality Manager</SelectItem>
                        <SelectItem value="Safety Manager">Safety Manager</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Flight Operations">Flight Operations</SelectItem>
                        <SelectItem value="Ground Operation">Ground Operation</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
                </FormControl>
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
                <FormControl>
                    <Input type="tel" placeholder="555-123-4567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <div className="space-y-2">
            <FormLabel>Documents</FormLabel>
            <div className="flex gap-4">
                <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Medical">Medical Certificate</SelectItem>
                                <SelectItem value="License">Pilot License</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="documentExpiry"
                    render={({ field }) => (
                        <FormItem className="flex-1">
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
        </div>

        <PermissionsForm />

        <div className="flex justify-end">
            <Button type="submit">Add Personnel</Button>
        </div>
      </form>
    </Form>
  );
}
