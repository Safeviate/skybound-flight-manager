

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useController } from 'react-hook-form';
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
import type { Role, User, Permission, UserDocument, NavMenuItem, Department } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { createUserAndSendWelcomeEmail } from '../actions';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { navItems as allNavItems, adminNavItems } from '@/components/layout/nav';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PermissionsListbox } from './permissions-listbox';
import { ALL_DOCUMENTS } from '@/lib/types';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const companyDepartments: Department[] = ['Management', 'Flight Operations', 'Ground Operation', 'Maintenance', 'Administrative', 'Cargo', 'Finance', 'Human Resources'];

const personnelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  role: z.custom<Role>((val) => typeof val === 'string' && val !== 'Student', {
      message: 'A valid role must be selected.'
  }),
  department: z.custom<Department>().optional(),
  instructorGrade: z.enum(['Grade 1', 'Grade 2', 'Grade 3']).optional(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
  })).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be selected.'),
  visibleMenuItems: z.array(z.string()).optional(),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface NewPersonnelFormProps {
    onSuccess: () => void;
}

const personnelRoles: Role[] = [
    'Accountable Manager',
    'Admin',
    'System Admin',
    'Aircraft Manager',
    'Auditee',
    'Chief Flight Instructor',
    'Driver',
    'Front Office',
    'Head Of Training',
    'HR Manager',
    'Instructor',
    'Maintenance',
    'Operations Manager',
    'Quality Manager',
    'Safety Manager',
];

const availableNavItems = [...allNavItems.filter(item => !item.requiredPermissions?.includes('Super User')), ...adminNavItems]
  .filter(item => item.label !== 'Functions' && item.label !== 'Seed Data' && item.label !== 'Manage Companies' && item.label !== 'System Health');

export function NewPersonnelForm({ onSuccess }: NewPersonnelFormProps) {
  const { company } = useUser();
  const { toast } = useToast();
  
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      department: undefined,
      consentDisplayContact: 'Not Consented',
      documents: ALL_DOCUMENTS.map(type => ({ type, expiryDate: null })),
      permissions: [],
      visibleMenuItems: availableNavItems.map(item => item.label),
    }
  });

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (selectedRole) {
      const defaultPermissions = ROLE_PERMISSIONS[selectedRole] || [];
      form.setValue('permissions', defaultPermissions);
    }
  }, [selectedRole, form]);

  const isInstructorRole = ['Instructor', 'Chief Flight Instructor', 'Head Of Training'].includes(selectedRole);


  async function handleFormSubmit(data: PersonnelFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.' });
        return;
    }

    const documentsToSave: UserDocument[] = (data.documents || [])
        .filter(doc => doc.expiryDate) // Only save documents that have an expiry date set
        .map(doc => ({
            id: `doc-${doc.type.toLowerCase().replace(/ /g, '-')}`,
            type: doc.type as typeof ALL_DOCUMENTS[number],
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null
        }));

    const dataToSubmit = {
        ...data,
        instructorGrade: isInstructorRole ? data.instructorGrade : null,
        visibleMenuItems: data.visibleMenuItems as NavMenuItem[],
        documents: documentsToSave,
    } as unknown as Omit<User, 'id'>

    const result = await createUserAndSendWelcomeEmail(dataToSubmit, company.id, company.name, false);

     if (result.success) {
        toast({
            title: 'Personnel Added',
            description: result.message,
        });
        form.reset();
        onSuccess();
    } else {
        toast({
            variant: 'destructive',
            title: 'Error Creating Personnel',
            description: result.message,
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
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
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="staff@company.com" {...field} />
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
                            <Input type="tel" placeholder="+27 12 345 6789" {...field} />
                        </FormControl>
                        <FormDescription>
                        Include country code.
                        </FormDescription>
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
                            {personnelRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                {role}
                                </SelectItem>
                            ))}
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
                            {companyDepartments.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                {dept}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {isInstructorRole && (
                        <FormField
                        control={form.control}
                        name="instructorGrade"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Instructor Grade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select instructor grade" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Grade 1">Grade 1</SelectItem>
                                    <SelectItem value="Grade 2">Grade 2</SelectItem>
                                    <SelectItem value="Grade 3">Grade 3</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                </div>
                
                <Separator />

                <FormField
                    control={form.control}
                    name="visibleMenuItems"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Visible Menu Items</FormLabel>
                                <FormDescription>
                                    Select the top-level navigation items this user will be able to see.
                                </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {availableNavItems.map((item) => (
                                    <FormField
                                        key={item.label}
                                        control={form.control}
                                        name="visibleMenuItems"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.label)}
                                                        onCheckedChange={(checked) => {
                                                            const newItems = checked
                                                                ? [...(field.value || []), item.label]
                                                                : field.value?.filter((label) => label !== item.label);
                                                            field.onChange(newItems);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{item.label}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Separator />
                
                <FormField
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Permissions</FormLabel>
                                <FormDescription>
                                    Select all permissions that apply to this user. Defaults are set by role.
                                </FormDescription>
                            </div>
                            <PermissionsListbox control={form.control} />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator />
                
                <FormField
                    control={form.control}
                    name="documents"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Document Expiry Dates</FormLabel>
                            <FormDescription>
                            Set the expiry date for each relevant document.
                            </FormDescription>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {ALL_DOCUMENTS.map((docType, index) => (
                                <FormField
                                    key={docType}
                                    control={form.control}
                                    name={`documents.${index}.expiryDate`}
                                    render={({ field }) => {
                                      const typedField = field as unknown as { value: Date | null | undefined, onChange: (date: Date | undefined) => void };
                                      return (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>{docType}</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn("pl-3 text-left font-normal", !typedField.value && "text-muted-foreground")}
                                                        >
                                                            {typedField.value ? format(typedField.value, "PPP") : <span>Set expiry date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={typedField.value || undefined} onSelect={typedField.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}}
                                />
                            ))}
                        </div>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                
                <Separator />

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
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Adding...' : 'Add Personnel'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
