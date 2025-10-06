

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { User, UserDocument } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { HIRE_AND_FLY_DOCUMENTS } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Camera, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { StandardCamera } from '@/components/ui/standard-camera';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_DOCUMENTS } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';


const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const studentFormSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  studentCode: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  instructor: z.string({
    required_error: 'Please select an instructor.',
  }),
  licenseType: z.string().optional(),
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
      url: z.string().optional().nullable(),
      file: z.any().optional(),
  })).optional(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
  nextOfKinName: z.string().optional(),
  nextOfKinRelation: z.string().optional(),
  nextOfKinPhone: z.string().regex(phoneRegex, 'Invalid phone number.').optional().or(z.literal('')),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface EditStudentFormProps {
  student: User;
  onUpdate: (data: User) => void;
  instructors: User[];
}

export function EditStudentForm({ student, onUpdate, instructors }: EditStudentFormProps) {
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
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
    if (student) {
        const existingDocs = student.documents || [];
        const allDocTypes = new Set(ALL_DOCUMENTS);
        existingDocs.forEach(d => allDocTypes.add(d.type as typeof ALL_DOCUMENTS[number]));

        const formDocs = Array.from(allDocTypes).map(docType => {
            const existing = existingDocs.find(d => d.type === docType);
            return {
                type: docType,
                expiryDate: existing?.expiryDate ? parseISO(existing.expiryDate) : null,
                url: existing?.url || null,
            }
        });

        form.reset({
            name: student.name || '',
            studentCode: student.studentCode || '',
            email: student.email || '',
            phone: student.phone || '',
            instructor: student.instructor || '',
            licenseType: student.licenseType || '',
            documents: formDocs,
            consentDisplayContact: student.consentDisplayContact || 'Not Consented',
            nextOfKinName: student.nextOfKinName || '',
            nextOfKinRelation: student.nextOfKinRelation || '',
            nextOfKinPhone: student.nextOfKinPhone || '',
        });
    }
  }, [student, form]);

  function handleFormSubmit(data: StudentFormValues) {
    const documentsToSave: UserDocument[] = (data.documents || [])
        .filter(doc => doc.expiryDate || doc.url) 
        .map(doc => ({
            id: `doc-${doc.type.toLowerCase().replace(/ /g, '-')}`,
            type: doc.type as typeof ALL_DOCUMENTS[number],
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null,
            url: doc.url || undefined,
        }));

    const updatedStudent: User = {
      ...student,
      ...data,
      documents: documentsToSave,
    };
    onUpdate(updatedStudent);
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="studentCode" render={({ field }) => (<FormItem><FormLabel>Student Code</FormLabel><FormControl><Input placeholder="e.g., S12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="student@email.com" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+27 12 345 6789" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="instructor" render={({ field }) => (<FormItem><FormLabel>Instructor</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select an instructor" /></SelectTrigger></FormControl><SelectContent>{instructors.map(i => (<SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="licenseType" render={({ field }) => (<FormItem><FormLabel>License Type</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Select a license type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="SPL">SPL</SelectItem><SelectItem value="PPL">PPL</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-base">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                        <FormField control={form.control} name="nextOfKinName" render={({ field }) => (<FormItem><FormLabel>Emergency Contact Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nextOfKinRelation" render={({ field }) => (<FormItem><FormLabel>Relation</FormLabel><FormControl><Input placeholder="e.g., Spouse" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nextOfKinPhone" render={({ field }) => (<FormItem className="col-span-full"><FormLabel>Emergency Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+27 98 765 4321" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </div>

                <div>
                    <FormLabel className="text-base font-semibold">Document Expiry Dates & Uploads</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        {(form.watch('documents') || []).map((docItem, index) => {
                            const documentUrl = watch(`documents.${index}.url`);
                            return (
                                <div key={docItem.type} className="p-4 border rounded-lg space-y-3">
                                    <p className="font-medium text-sm">{docItem.type}</p>
                                    <div className="space-y-2">
                                        <FormField
                                            control={form.control}
                                            name={`documents.${index}.expiryDate`}
                                            render={({ field }) => {
                                                const typedField = field as unknown as { value: Date | null | undefined, onChange: (date: Date | undefined) => void };
                                                return (
                                                    <FormItem>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !typedField.value && "text-muted-foreground")}>
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
                                                )
                                            }}
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openCamera(`documents.${index}.url`)}>
                                                <Camera className="mr-2 h-4 w-4" /> Take Photo
                                            </Button>
                                            <FormField
                                                control={form.control}
                                                name={`documents.${index}.file`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Button type="button" variant="outline" asChild size="sm" className="w-full">
                                                                    <label htmlFor={`doc-file-${index}`} className="cursor-pointer">
                                                                        <FileUp className="mr-2 h-4 w-4" />
                                                                        {documentUrl ? 'Change' : 'Upload'}
                                                                    </label>
                                                                </Button>
                                                                <Input
                                                                    id={`doc-file-${index}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="absolute w-0 h-0 opacity-0"
                                                                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0], index)}
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <FormField
                control={form.control}
                name="consentDisplayContact"
                render={({ field }) => (
                    <FormItem className="space-y-3 rounded-md border p-4">
                    <FormLabel>Privacy Consent</FormLabel>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
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
