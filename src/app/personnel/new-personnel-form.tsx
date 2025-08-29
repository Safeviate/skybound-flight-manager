

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
import type { Role, User, Permission, UserDocument, NavMenuItem, Department, CompanyRole, CompanyDepartment } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileUp, ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { navItems as allNavItems, adminNavItems } from '@/components/layout/nav';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PermissionsListbox } from './permissions-listbox';
import { ALL_DOCUMENTS } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { createUserAndSendWelcomeEmail } from '../actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StandardCamera } from '@/components/ui/standard-camera';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const personnelFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  role: z.custom<Role>((val) => typeof val === 'string' && val !== 'Student', {
      message: 'A valid role must be selected.'
  }),
  department: z.custom<Department>().optional(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
      url: z.string().optional().nullable(),
      file: z.any().optional(),
  })).optional(),
  permissions: z.array(z.string()).optional(),
  visibleMenuItems: z.array(z.string()).optional(),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface NewPersonnelFormProps {
    onSuccess: () => void;
}

const availableNavItems = [...allNavItems, ...adminNavItems]
  .filter(item => item.label !== 'Functions' && item.label !== 'Seed Data' && item.label !== 'Manage Companies' && item.label !== 'System Health');

export function NewPersonnelForm({ onSuccess }: NewPersonnelFormProps) {
  const { company } = useUser();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      department: undefined,
      consentDisplayContact: 'Not Consented',
      documents: ALL_DOCUMENTS.map(type => ({ type, expiryDate: null, url: null })),
      permissions: [],
      visibleMenuItems: availableNavItems.map(item => item.label),
    }
  });

  const { setValue, watch } = form;

  const handleFileChange = useCallback((file: File, index: number) => {
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 500KB.' });
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only JPG, PNG, and WEBP are accepted.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue(`documents.${index}.url`, reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  }, [setValue, toast]);

  const handlePhotoSuccess = (dataUrl: string) => {
    if (photoTarget) {
      setValue(photoTarget as any, dataUrl, { shouldValidate: true });
    }
    setIsCameraOpen(false);
    setPhotoTarget(null);
  };
  
  const openCamera = (targetField: string) => {
    setPhotoTarget(targetField);
    setIsCameraOpen(true);
  };

  useEffect(() => {
    const fetchData = async () => {
        if (!company) return;
        try {
            const rolesQuery = query(collection(db, `companies/${company.id}/roles`));
            const deptsQuery = query(collection(db, `companies/${company.id}/departments`));
            
            const [rolesSnapshot, deptsSnapshot] = await Promise.all([
                getDocs(rolesQuery),
                getDocs(deptsQuery),
            ]);
            setRoles(rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyRole)));
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch roles or departments.' });
        }
    };
    fetchData();
  }, [company, toast]);

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (selectedRole) {
      const roleData = roles.find(r => r.name === selectedRole);
      if (roleData) {
        form.setValue('permissions', roleData.permissions || []);
      }
    }
  }, [selectedRole, roles, form]);

  const isInstructorRole = selectedRole === 'Instructor';

  async function handleFormSubmit(data: PersonnelFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'Company context not found.' });
        return;
    }
    
    const documentsToSave = (data.documents || [])
        .filter(doc => doc.expiryDate || doc.url)
        .map(doc => ({
            type: doc.type,
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null,
            url: doc.url || undefined,
        }));

    const userData: Omit<User, 'id'> = {
        companyId: company.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department,
        consentDisplayContact: data.consentDisplayContact,
        permissions: data.permissions as Permission[],
        visibleMenuItems: data.visibleMenuItems as NavMenuItem[],
        documents: documentsToSave as UserDocument[],
        status: 'Active',
    };
    
    const result = await createUserAndSendWelcomeEmail(userData, company.id, company.name, settings.welcomeEmailEnabled);

    if (result.success) {
      toast({ title: 'Personnel Added', description: result.message });
      form.reset();
      onSuccess();
    } else {
      toast({ variant: 'destructive', title: 'Error Creating Personnel', description: result.message });
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="staff@company.com" {...field} /></FormControl><FormDescription>If provided, a user account will be created.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+27 12 345 6789" {...field} /></FormControl><FormDescription>Include country code.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent>{roles.map((role) => (<SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />

                <FormField control={form.control} name="consentDisplayContact" render={({ field }) => (<FormItem className="space-y-3 rounded-md border p-4"><FormLabel>Privacy Consent</FormLabel><FormDescription>Select whether this user's contact details (email and phone number) can be displayed to other users within the application for operational purposes.</FormDescription><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Consented" /></FormControl><FormLabel className="font-normal">I consent</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Not Consented" /></FormControl><FormLabel className="font-normal">I do not consent</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Adding...' : 'Add Personnel'}
          </Button>
        </div>
      </form>
    </Form>
    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
            <DialogDescription>Take a picture of the document.</DialogDescription>
          </DialogHeader>
          <StandardCamera onSuccess={handlePhotoSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
