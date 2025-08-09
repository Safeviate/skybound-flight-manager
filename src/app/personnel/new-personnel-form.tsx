
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
import type { Role, User, Permission } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/types';

const documents = [
  "Passport",
  "Visa",
  "Identification",
  "Drivers License",
  "Pilot License",
  "Medical Certificate",
  "Logbook",
  "Certificate of release to service",
  "Certificate of registration",
  "Mass and balance",
  "Radio station license",
] as const;

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const personnelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  role: z.custom<Role>((val) => typeof val === 'string' && val !== 'Student', {
      message: 'A valid role must be selected.'
  }),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  requiredDocuments: z.array(z.string()).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be selected.'),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface NewPersonnelFormProps {
    onSubmit: (data: Omit<User, 'id'>) => void;
}

const personnelRoles: Role[] = [
    'Accountable Manager',
    'Admin',
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

export function NewPersonnelForm({ onSubmit }: NewPersonnelFormProps) {
  
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      consentDisplayContact: 'Not Consented',
      requiredDocuments: [],
      permissions: [],
    }
  });

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (selectedRole) {
      const defaultPermissions = ROLE_PERMISSIONS[selectedRole] || [];
      form.setValue('permissions', defaultPermissions);
    }
  }, [selectedRole, form]);


  function handleFormSubmit(data: PersonnelFormValues) {
    onSubmit(data as unknown as Omit<User, 'id'>);
    form.reset();
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
                </div>
                
                <Separator />
                
                <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Permissions</FormLabel>
                                <FormDescription>
                                    Select the permissions this user will have. Defaults are set by role.
                                </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {ALL_PERMISSIONS.map((permission) => (
                                    <FormField
                                        key={permission}
                                        control={form.control}
                                        name="permissions"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(permission)}
                                                        onCheckedChange={(checked) => {
                                                            const newPermissions = checked
                                                                ? [...field.value, permission]
                                                                : field.value?.filter((p) => p !== permission);
                                                            field.onChange(newPermissions);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{permission}</FormLabel>
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
                    name="requiredDocuments"
                    render={() => (
                        <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Required Documents</FormLabel>
                            <FormDescription>
                            Select the documents this user is required to upload. They will be notified.
                            </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {documents.map((item) => (
                            <FormField
                                key={item}
                                control={form.control}
                                name="requiredDocuments"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={item}
                                    className="flex flex-row items-center space-x-3 space-y-0"
                                    >
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                            ? field.onChange([...(field.value || []), item])
                                            : field.onChange(
                                                field.value?.filter(
                                                    (value) => value !== item
                                                )
                                                )
                                        }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        {item}
                                    </FormLabel>
                                    </FormItem>
                                )
                                }}
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
        <div className="flex justify-end">
          <Button type="submit">Add Personnel</Button>
        </div>
      </form>
    </Form>
  );
}
