
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
import type { Role, User, Permission, UserDocument, NavMenuItem } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { navItems as allNavItems, adminNavItems } from '@/components/layout/nav';

const documents = [
  "Passport",
  "Visa",
  "Identification",
  "Drivers License",
  "Pilot License",
  "Medical Certificate",
  "Logbook",
  "Airport Access",
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
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
  })).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be selected.'),
  visibleMenuItems: z.array(z.string()).optional(),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface EditPersonnelFormProps {
    personnel: User;
    onSubmit: (data: User) => void;
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
    .filter(item => item.label !== 'Functions' && item.label !== 'Seed Data' && item.label !== 'Manage Companies');

export function EditPersonnelForm({ personnel, onSubmit }: EditPersonnelFormProps) {
  
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      permissions: [],
      documents: documents.map(docType => ({ type: docType, expiryDate: null })),
      visibleMenuItems: [],
    },
  });
  
  const selectedRole = form.watch('role');

  useEffect(() => {
    const existingDocs = personnel.documents || [];
    const formDocs = documents.map(docType => {
        const existing = existingDocs.find(d => d.type === docType);
        return {
            type: docType,
            expiryDate: existing?.expiryDate ? parseISO(existing.expiryDate) : null,
        }
    });

    form.reset({
      name: personnel.name || '',
      email: personnel.email || '',
      role: personnel.role,
      phone: personnel.phone || '',
      consentDisplayContact: personnel.consentDisplayContact || 'Not Consented',
      documents: formDocs,
      permissions: personnel.permissions || [],
      visibleMenuItems: personnel.visibleMenuItems || availableNavItems.map(i => i.label),
    })
  }, [personnel, form]);

  useEffect(() => {
    if (selectedRole && form.formState.isDirty && !form.formState.dirtyFields.permissions) {
      const defaultPermissions = ROLE_PERMISSIONS[selectedRole] || [];
      form.setValue('permissions', defaultPermissions, { shouldDirty: true });
    }
  }, [selectedRole, form]);


  function handleFormSubmit(data: PersonnelFormValues) {
    const documentsToSave: UserDocument[] = (data.documents || [])
        .filter(doc => doc.expiryDate) // Only save documents that have an expiry date set
        .map(doc => ({
            id: `doc-${doc.type.toLowerCase().replace(/ /g, '-')}`,
            type: doc.type,
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null
        }));

    const updatedPersonnel: User = {
        ...personnel,
        ...data,
        visibleMenuItems: data.visibleMenuItems as NavMenuItem[],
        permissions: data.permissions as Permission[],
        documents: documentsToSave,
    };
    onSubmit(updatedPersonnel);
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                            {documents.map((docType, index) => (
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
        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
