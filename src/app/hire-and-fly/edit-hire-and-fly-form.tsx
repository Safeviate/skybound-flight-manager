

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

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const pilotFormSchema = z.object({
  name: z.string().min(2, 'Name is required.'),
  email: z.string().email('A valid email is required.'),
  phone: z.string().regex(phoneRegex, 'Invalid phone number.'),
  documents: z.array(z.object({
      type: z.string(),
      expiryDate: z.date().nullable(),
      url: z.string().optional().nullable(),
      file: z.any().optional(),
  })).optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinRelation: z.string().optional(),
  nextOfKinPhone: z.string().regex(phoneRegex, 'Invalid phone number.').optional().or(z.literal('')),
});

type PilotFormValues = z.infer<typeof pilotFormSchema>;

interface EditHireAndFlyFormProps {
  pilot: User;
  onUpdate: (data: User) => void;
}

export function EditHireAndFlyForm({ pilot, onUpdate }: EditHireAndFlyFormProps) {
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);

  const form = useForm<PilotFormValues>({
    resolver: zodResolver(pilotFormSchema),
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
    const existingDocs = pilot.documents || [];
    const formDocs = HIRE_AND_FLY_DOCUMENTS.map(docType => {
        const existing = existingDocs.find(d => d.type === docType);
        return {
            type: docType,
            expiryDate: existing?.expiryDate ? parseISO(existing.expiryDate) : null,
            url: existing?.url || null,
        }
    });

    form.reset({
      name: pilot.name,
      email: pilot.email,
      phone: pilot.phone,
      documents: formDocs,
      nextOfKinName: pilot.nextOfKinName,
      nextOfKinRelation: pilot.nextOfKinRelation,
      nextOfKinPhone: pilot.nextOfKinPhone,
    });
  }, [pilot, form]);

  function handleFormSubmit(data: PilotFormValues) {
    const documentsToSave: UserDocument[] = (data.documents || [])
        .filter(doc => doc.expiryDate || doc.url) 
        .map(doc => ({
            id: `doc-${doc.type.toLowerCase().replace(/ /g, '-')}`,
            type: doc.type as typeof HIRE_AND_FLY_DOCUMENTS[number],
            expiryDate: doc.expiryDate ? format(doc.expiryDate, 'yyyy-MM-dd') : null,
            url: doc.url || undefined,
        }));

    const updatedPilot: User = {
      ...pilot,
      ...data,
      documents: documentsToSave,
    };
    onUpdate(updatedPilot);
  }

  return (
    <>
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
        
        <Separator />

        <div className="space-y-2">
            <h3 className="font-medium">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nextOfKinName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="nextOfKinRelation" render={({ field }) => (<FormItem><FormLabel>Relation</FormLabel><FormControl><Input placeholder="e.g., Spouse" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="nextOfKinPhone" render={({ field }) => (<FormItem className="col-span-full"><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+27 98 765 4321" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
        
        <Separator />

        <div className="space-y-2 pt-4">
            <h3 className="font-medium">Pilot Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.getValues('documents')?.map((docItem, index) => {
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
