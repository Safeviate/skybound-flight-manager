
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, RefreshCw, Copy } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { PermissionsForm } from './permissions-form';
import type { Role, User } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const personnelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  role: z.enum(['Accountable Manager', 'Admin', 'Aircraft Manager', 'Chief Flight Instructor', 'Driver', 'Front Office', 'Head Of Training', 'HR Manager', 'Instructor', 'Maintenance', 'Operations Manager', 'Quality Manager', 'Safety Manager', 'Student'], {
      required_error: 'Please select a role.'
  }),
  department: z.string().optional(),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one permission.',
  }),
  email: z.string().email({ message: "Please enter a valid email."}).optional().or(z.literal('')),
  password: z.string().optional(),
  phone: z.string().min(10, { message: "Please enter a valid phone number."}),
  medicalExpiry: z.date().optional(),
  licenseExpiry: z.date().optional(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  mustChangePassword: z.boolean().default(false),
  externalCompanyName: z.string().optional(),
  externalPosition: z.string().optional(),
  accessStartDate: z.date().optional(),
  accessEndDate: z.date().optional(),
}).refine(data => {
    if (data.role === 'Admin') {
        return !!data.email && !!data.password && data.password.length >= 8;
    }
    return true;
}, {
    message: 'Email and a password of at least 8 characters are required for roles requiring system access.',
    path: ['password'],
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface PersonnelFormProps {
    onSubmit: (data: Omit<User, 'id'>) => void;
    existingPersonnel?: User;
}

export function PersonnelForm({ onSubmit, existingPersonnel }: PersonnelFormProps) {
  const { toast } = useToast();
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: existingPersonnel ? {
        ...existingPersonnel,
        medicalExpiry: existingPersonnel.medicalExpiry ? parseISO(existingPersonnel.medicalExpiry) : undefined,
        licenseExpiry: existingPersonnel.licenseExpiry ? parseISO(existingPersonnel.licenseExpiry) : undefined,
        accessStartDate: existingPersonnel.accessStartDate ? parseISO(existingPersonnel.accessStartDate) : undefined,
        accessEndDate: existingPersonnel.accessEndDate ? parseISO(existingPersonnel.accessEndDate) : undefined,
    } : {
      permissions: [],
      consentDisplayContact: 'Not Consented',
      mustChangePassword: true,
      department: '',
      email: '',
      password: '',
      phone: '',
      externalCompanyName: '',
      externalPosition: '',
      name: '',
      role: undefined,
    }
  });

  const selectedRole = form.watch('role');

  React.useEffect(() => {
    if (selectedRole && !existingPersonnel) {
      const permissionsForRole = ROLE_PERMISSIONS[selectedRole] || [];
      form.setValue('permissions', permissionsForRole);
    }
  }, [selectedRole, form, existingPersonnel]);

  function handleFormSubmit(data: PersonnelFormValues) {
    const submissionData = {
        ...data,
        medicalExpiry: data.medicalExpiry ? format(data.medicalExpiry, 'yyyy-MM-dd') : undefined,
        licenseExpiry: data.licenseExpiry ? format(data.licenseExpiry, 'yyyy-MM-dd') : undefined,
        accessStartDate: data.accessStartDate ? format(data.accessStartDate, 'yyyy-MM-dd') : undefined,
        accessEndDate: data.accessEndDate ? format(data.accessEndDate, 'yyyy-MM-dd') : undefined,
    };
    onSubmit(submissionData as Omit<User, 'id'>);
  }

  const generatePassword = () => {
    const newPassword = Math.random().toString(36).slice(-10);
    form.setValue('password', newPassword, { shouldValidate: true });
  };

  const copyPassword = () => {
    const password = form.getValues('password');
    if (password) {
        navigator.clipboard.writeText(password);
        toast({
            title: "Password Copied",
            description: "The temporary password has been copied to your clipboard.",
        });
    }
  }

  const showCredentialsFields = selectedRole === 'Admin';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 max-h-[70vh] overflow-y-auto p-1 pr-4">
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

            {showCredentialsFields && (
                <>
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
                    {!existingPersonnel ? (
                        <div className="space-y-2">
                            <FormLabel>Temporary Password</FormLabel>
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input readOnly {...field} />
                                            </FormControl>
                                            <Button type="button" variant="secondary" onClick={copyPassword} size="icon" disabled={!field.value}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                            <Button type="button" variant="outline" onClick={generatePassword} size="icon">
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <FormDescription>Generate a password for the new user.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    ) : (
                        <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <Input type="password" {...field} placeholder="Leave blank to keep current" />
                            </FormControl>
                            <FormDescription>
                                Leave blank to keep current password.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                </>
            )}
        </div>

        <div className="space-y-2 rounded-md border p-4">
            <FormLabel>Documents (Optional)</FormLabel>
            <FormDescription>
                Record the expiry dates for the user's documents.
            </FormDescription>
            <div className="flex flex-col md:flex-row gap-4 pt-2">
                <FormField
                    control={form.control}
                    name="medicalExpiry"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                             <FormLabel>Medical Expiry</FormLabel>
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
                    name="licenseExpiry"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                             <FormLabel>License Expiry</FormLabel>
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

        <FormField
          control={form.control}
          name="consentDisplayContact"
          render={({ field }) => (
            <FormItem className="space-y-3 rounded-md border p-4">
              <FormLabel>Privacy Consent</FormLabel>
              <FormDescription>
                Select whether this user's contact details (email and phone number) can be displayed to other users within the application for operational purposes.
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Consented" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      I consent
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Not Consented" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      I do not consent
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="flex justify-end">
            <Button type="submit">{existingPersonnel ? 'Save Changes' : 'Add Personnel'}</Button>
        </div>
      </form>
    </Form>
  );
}
