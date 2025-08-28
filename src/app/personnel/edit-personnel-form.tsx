

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
import { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLE_PERMISSIONS, ALL_PERMISSIONS } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowLeftRight, FileUp, ImageIcon, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { navItems as allNavItems, adminNavItems } from '@/components/layout/nav';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/context/user-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PermissionsListbox } from './permissions-listbox';
import { useToast } from '@/hooks/use-toast';
import { ALL_DOCUMENTS } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
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
  instructorGrade: z.enum(['Grade 1', 'Grade 2', 'Grade 3']).optional().nullable(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
      url: z.string().optional().nullable(),
      file: z.any().optional(),
  })).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission must be selected.'),
  visibleMenuItems: z.array(z.string()).optional(),
});

type PersonnelFormValues = z.infer<typeof personnelFormSchema>;

interface EditPersonnelFormProps {
    personnel: User;
    onSubmit: (data: User) => void;
}

const availableNavItems = [...allNavItems, ...adminNavItems]
    .filter(item => item.label !== 'Functions' && item.label !== 'Seed Data' && item.label !== 'Manage Companies' && item.label !== 'System Health');

export function EditPersonnelForm({ personnel, onSubmit }: EditPersonnelFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);
  
  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(personnelFormSchema),
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
                getDocs(deptsQuery)
            ]);
            setRoles(rolesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyRole)));
            setDepartments(deptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment)));

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch roles or departments.' });
        }
    };
    fetchData();
  }, [company, toast]);

  useEffect(() => {
    if (personnel) {
        const existingDocs = personnel.documents || [];
        const formDocs = ALL_DOCUMENTS.map(docType => {
            const existing = existingDocs.find(d => d.type === docType);
            return {
                type: docType,
                expiryDate: existing?.expiryDate ? parseISO(existing.expiryDate) : null,
                url: existing?.url || null,
            }
        });

        form.reset({
            name: personnel.name || '',
            email: personnel.email || '',
            role: personnel.role,
            department: personnel.department || undefined,
            phone: personnel.phone || '',
            instructorGrade: personnel.instructorGrade || null,
            consentDisplayContact: personnel.consentDisplayContact || 'Not Consented',
            documents: formDocs,
            permissions: personnel.permissions || [],
            visibleMenuItems: personnel.visibleMenuItems || availableNavItems.map(i => i.label),
        });
    }
  }, [personnel, form]);


  const selectedRole = form.watch('role');

  useEffect(() => {
    if (selectedRole && roles.length > 0) {
      const roleData = roles.find(r => r.name === selectedRole);
      if (roleData) {
        form.setValue('permissions', roleData.permissions || []);
      }
    }
  }, [selectedRole, roles, form]);

  const isInstructorRole = selectedRole?.toLowerCase().includes('instructor');

  function handleFormSubmit(data: PersonnelFormValues) {
    const documentsToSave: UserDocument[] = (data.documents || [])
        .filter(doc => doc.expiryDate || doc.url) 
        .map(doc => ({
            id: `doc-${doc.type.toLowerCase().replace(/ /g, '-')}`,
            type: doc.type as typeof ALL_DOCUMENTS[number],
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null,
            url: doc.url || undefined,
        }));

    const updatedPersonnel: User = {
        ...personnel,
        ...data,
        instructorGrade: isInstructorRole ? data.instructorGrade : null,
        visibleMenuItems: data.visibleMenuItems as NavMenuItem[],
        permissions: data.permissions as Permission[],
        documents: documentsToSave,
    };
    onSubmit(updatedPersonnel);
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="staff@company.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+27 12 345 6789" {...field} value={field.value ?? ''} /></FormControl><FormDescription>Include country code.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl><SelectContent>{roles.map((role) => (<SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger></FormControl><SelectContent>{departments.map((dept) => (<SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    {isInstructorRole && (<FormField control={form.control} name="instructorGrade" render={({ field }) => (<FormItem><FormLabel>Instructor Grade</FormLabel><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder="Select instructor grade" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Grade 1">Grade 1</SelectItem><SelectItem value="Grade 2">Grade 2</SelectItem><SelectItem value="Grade 3">Grade 3</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />)}
                </div>
                
                <Separator />
                
                <FormField control={form.control} name="visibleMenuItems" render={() => (<FormItem><div className="mb-4"><FormLabel className="text-base">Visible Menu Items</FormLabel><FormDescription>Select the top-level navigation items this user will be able to see.</FormDescription></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4">{availableNavItems.map((item) => (<FormField key={item.label} control={form.control} name="visibleMenuItems" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { const newItems = checked ? [...(field.value || []), item.label] : field.value?.filter((label) => label !== item.label); field.onChange(newItems); }} /></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)} />

                <Separator />

                 <FormField control={form.control} name="permissions" render={() => (<FormItem><div className="mb-4"><FormLabel className="text-base">Permissions</FormLabel><FormDescription>Select all permissions that apply to this user. Defaults are set by role.</FormDescription></div><PermissionsListbox control={form.control} allPermissions={ALL_PERMISSIONS} /><FormMessage /></FormItem>)} />
                
                <Separator />
                
                <FormField control={form.control} name="documents" render={() => (<FormItem><div className="mb-4"><FormLabel className="text-base">Document Expiry Dates & Uploads</FormLabel><FormDescription>Set the expiry date and upload a photo for each relevant document.</FormDescription></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{form.getValues('documents')?.map((docItem, index) => { const documentUrl = watch(`documents.${index}.url`); return (<div key={docItem.type} className="p-4 border rounded-lg space-y-3"><p className="font-medium text-sm">{docItem.type}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center"><FormField control={form.control} name={`documents.${index}.expiryDate`} render={({ field }) => { const typedField = field as unknown as { value: Date | null | undefined, onChange: (date: Date | undefined) => void }; return (<FormItem className="sm:col-span-1"><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !typedField.value && "text-muted-foreground")}>{typedField.value ? format(typedField.value, "PPP") : <span>Set expiry date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={typedField.value || undefined} onSelect={typedField.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}} /><div className="sm:col-span-2 flex items-center justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openCamera(`documents.${index}.url`)}><Camera className="mr-2 h-4 w-4" /> Take Photo</Button><FormField control={form.control} name={`documents.${index}.file`} render={({ field }) => (<FormItem><FormControl><div className="relative"><Button type="button" variant="outline" asChild size="sm"><label htmlFor={`doc-file-${index}`} className="cursor-pointer"><FileUp className="mr-2 h-4 w-4" /> {documentUrl ? 'Change' : 'Upload'}</label></Button><Input id={`doc-file-${index}`} type="file" accept="image/*" className="absolute w-0 h-0 opacity-0" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], index)} /></div></FormControl><FormMessage /></FormItem>)} /></div></div></div>)})}</div><FormMessage /></FormItem>)} />
                
                <Separator />

                <FormField control={form.control} name="consentDisplayContact" render={({ field }) => (<FormItem className="space-y-3 rounded-md border p-4"><FormLabel>Privacy Consent</FormLabel><FormDescription>Select whether this user's contact details (email and phone number) can be displayed to other users within the application for operational purposes.</FormDescription><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Consented" /></FormControl><FormLabel className="font-normal">I consent</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Not Consented" /></FormControl><FormLabel className="font-normal">I do not consent</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
            </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button type="submit">Save Changes</Button>
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
