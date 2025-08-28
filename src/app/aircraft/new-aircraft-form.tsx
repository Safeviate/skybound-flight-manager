
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
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Bot, FileUp, ImageIcon, Camera } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState, useEffect, useCallback } from 'react';
import { AircraftInfoScanner } from './aircraft-info-scanner';
import { useSettings } from '@/context/settings-provider';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StandardCamera } from '@/components/ui/standard-camera';

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const aircraftFormSchema = z.object({
  make: z.string().min(1, 'Aircraft make is required.'),
  model: z.string().min(1, 'Aircraft model is required.'),
  tailNumber: z.string().min(1, 'Aircraft registration is required.'),
  aircraftType: z.enum(['SE', 'ME', 'FSTD']).optional(),
  hours: z.coerce.number().min(0, 'Hobbs hours must be a positive number.'),
  airworthinessDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  insuranceDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  releaseToServiceDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  registrationDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  massAndBalanceDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  radioLicenseDoc: z.object({ expiryDate: z.date().optional(), url: z.string().optional() }),
  currentTachoReading: z.coerce.number().optional(),
  next50HourInspection: z.coerce.number().optional(),
  next100HourInspection: z.coerce.number().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
  onSuccess: () => void;
  initialData?: Aircraft | null;
}

const parseDoc = (doc?: { expiryDate: string | null, url?: string | null }) => ({
    expiryDate: doc?.expiryDate ? parseISO(doc.expiryDate) : undefined,
    url: doc?.url || undefined,
});

export function NewAircraftForm({ onSuccess, initialData }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'registration' | 'hobbs' | null>(null);
  const { settings } = useSettings();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);

  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: initialData ? {
        ...initialData,
        airworthinessDoc: parseDoc(initialData.airworthinessDoc),
        insuranceDoc: parseDoc(initialData.insuranceDoc),
        releaseToServiceDoc: parseDoc(initialData.releaseToServiceDoc),
        registrationDoc: parseDoc(initialData.registrationDoc),
        massAndBalanceDoc: parseDoc(initialData.massAndBalanceDoc),
        radioLicenseDoc: parseDoc(initialData.radioLicenseDoc),
        currentTachoReading: initialData.currentTachoReading ?? undefined,
        next50HourInspection: initialData.next50HourInspection ?? undefined,
        next100HourInspection: initialData.next100HourInspection ?? undefined,
    } : {
      make: '',
      model: '',
      tailNumber: '',
      hours: 0,
      currentTachoReading: 0,
      next50HourInspection: 0,
      next100HourInspection: 0,
    },
  });
  
  const { watch, setValue } = form;

  const handleFileChange = useCallback((file: File, fieldName: keyof AircraftFormValues) => {
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
        setValue(fieldName as any, reader.result as string, { shouldValidate: true });
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
    if (initialData) {
      form.reset({
        ...initialData,
        airworthinessDoc: parseDoc(initialData.airworthinessDoc),
        insuranceDoc: parseDoc(initialData.insuranceDoc),
        releaseToServiceDoc: parseDoc(initialData.releaseToServiceDoc),
        registrationDoc: parseDoc(initialData.registrationDoc),
        massAndBalanceDoc: parseDoc(initialData.massAndBalanceDoc),
        radioLicenseDoc: parseDoc(initialData.radioLicenseDoc),
        currentTachoReading: initialData.currentTachoReading ?? undefined,
        next50HourInspection: initialData.next50HourInspection ?? undefined,
        next100HourInspection: initialData.next100HourInspection ?? undefined,
      });
    } else {
      form.reset({
        make: '',
        model: '',
        tailNumber: '',
        hours: 0,
        currentTachoReading: 0,
        next50HourInspection: 0,
        next100HourInspection: 0,
        airworthinessDoc: { expiryDate: undefined, url: undefined },
        insuranceDoc: { expiryDate: undefined, url: undefined },
        releaseToServiceDoc: { expiryDate: undefined, url: undefined },
        registrationDoc: { expiryDate: undefined, url: undefined },
        massAndBalanceDoc: { expiryDate: undefined, url: undefined },
        radioLicenseDoc: { expiryDate: undefined, url: undefined },
      });
    }
  }, [initialData, form]);

  async function handleFormSubmit(data: AircraftFormValues) {
    if (!company) {
      toast({ variant: 'destructive', title: 'Error', description: 'No company context.' });
      return;
    }
    
    const aircraftDataToSave = {
        ...data,
        airworthinessDoc: {
            expiryDate: data.airworthinessDoc?.expiryDate ? data.airworthinessDoc.expiryDate.toISOString() : null,
            url: data.airworthinessDoc?.url || null
        },
        insuranceDoc: {
            expiryDate: data.insuranceDoc?.expiryDate ? data.insuranceDoc.expiryDate.toISOString() : null,
            url: data.insuranceDoc?.url || null
        },
        releaseToServiceDoc: {
            expiryDate: data.releaseToServiceDoc?.expiryDate ? data.releaseToServiceDoc.expiryDate.toISOString() : null,
            url: data.releaseToServiceDoc?.url || null
        },
        registrationDoc: {
            expiryDate: data.registrationDoc?.expiryDate ? data.registrationDoc.expiryDate.toISOString() : null,
            url: data.registrationDoc?.url || null
        },
        massAndBalanceDoc: {
            expiryDate: data.massAndBalanceDoc?.expiryDate ? data.massAndBalanceDoc.expiryDate.toISOString() : null,
            url: data.massAndBalanceDoc?.url || null
        },
        radioLicenseDoc: {
            expiryDate: data.radioLicenseDoc?.expiryDate ? data.radioLicenseDoc.expiryDate.toISOString() : null,
            url: data.radioLicenseDoc?.url || null
        },
        currentTachoReading: data.currentTachoReading ?? null,
        next50HourInspection: data.next50HourInspection ?? null,
        next100HourInspection: data.next100HourInspection ?? null,
    };

    try {
        if (initialData) {
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, initialData.id);
            await setDoc(aircraftRef, { ...initialData, ...aircraftDataToSave });
            toast({ title: 'Aircraft Updated', description: `${data.tailNumber} details saved.` });
        } else {
            const newAircraft: Omit<Aircraft, 'id'> = {
                ...aircraftDataToSave,
                companyId: company.id,
                status: 'Available',
                location: 'Default Base',
                checklistStatus: 'ready',
            } as Omit<Aircraft, 'id'>;
            await addDoc(collection(db, `companies/${company.id}/aircraft`), newAircraft);
            toast({ title: 'Aircraft Added', description: `${data.tailNumber} has been added to the fleet.` });
        }
        onSuccess();
    } catch (error) {
        console.error("Error saving aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not save aircraft data.' });
    }
  }
  
  const openScanner = (mode: 'registration' | 'hobbs') => {
    setScanMode(mode);
    setIsScannerOpen(true);
  }

  const handleScanSuccess = (data: { registration?: string; hobbs?: number }) => {
    if (data.registration) {
      form.setValue('tailNumber', data.registration);
    }
    if (data.hobbs) {
      form.setValue('hours', data.hobbs);
    }
    setIsScannerOpen(false);
    toast({
      title: 'Scan Successful',
      description: 'The form has been updated with the scanned value.',
    });
  };

  const DatePickerField = ({ name, label, urlFieldName, fileFieldName }: { name: keyof AircraftFormValues, label: string, urlFieldName: string, fileFieldName: string }) => {
      const documentUrl = watch(urlFieldName as keyof AircraftFormValues) as string;
    
      return (
        <div className="p-4 border rounded-lg space-y-3">
          <p className="font-medium text-sm">{label}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <FormField
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value as Date, "PPP") : <span>Set expiry date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value as Date | undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="sm:col-span-2 flex items-center justify-end gap-4">
                 <Button type="button" variant="outline" size="sm" onClick={() => openCamera(urlFieldName)}>
                    <Camera className="mr-2 h-4 w-4" /> Take Photo
                 </Button>
                 <FormField
                    control={form.control}
                    name={fileFieldName as any}
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div className="relative">
                                    <Button type="button" variant="outline" asChild size="sm">
                                        <label htmlFor={fileFieldName} className="cursor-pointer">
                                            <FileUp className="mr-2 h-4 w-4" />
                                            {documentUrl ? 'Change' : 'Upload'}
                                        </label>
                                    </Button>
                                    <Input
                                        id={fileFieldName}
                                        type="file"
                                        accept="image/*"
                                        className="absolute w-0 h-0 opacity-0"
                                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0], urlFieldName as any)}
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
      );
  }


  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
        <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Aircraft Make</FormLabel><FormControl><Input placeholder="e.g., Cessna" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Aircraft Model</FormLabel><FormControl><Input placeholder="e.g., 172 Skyhawk" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tailNumber" render={({ field }) => (<FormItem><FormLabel>Aircraft Registration</FormLabel><div className="flex items-center gap-2"><FormControl><Input placeholder="e.g., ZS-ABC" {...field} /></FormControl>{settings.useAiChecklists && (<Button type="button" variant="outline" size="icon" onClick={() => openScanner('registration')}><Bot className="h-4 w-4" /></Button>)}</div><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="aircraftType" render={({ field }) => (<FormItem><FormLabel>Aircraft Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select aircraft type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="SE">SE</SelectItem><SelectItem value="ME">ME</SelectItem><SelectItem value="FSTD">FSTD</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="hours" render={({ field }) => (<FormItem><FormLabel>Current Hobbs Hours</FormLabel><div className="flex items-center gap-2"><FormControl><Input type="number" step="0.1" placeholder="e.g., 1234.5" {...field} /></FormControl>{settings.useAiChecklists && (<Button type="button" variant="outline" size="icon" onClick={() => openScanner('hobbs')}><Bot className="h-4 w-4" /></Button>)}</div><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />
                <h4 className="font-medium text-center">Maintenance Information</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="currentTachoReading" render={({ field }) => (<FormItem><FormLabel>Current Tacho Reading</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 4321.0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="next50HourInspection" render={({ field }) => (<FormItem><FormLabel>Next 50hr Insp.</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 1284.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="next100HourInspection" render={({ field }) => (<FormItem><FormLabel>Next 100hr Insp.</FormLabel><FormControl><Input type="number" step="0.1" placeholder="e.g., 1334.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Separator />

                <h4 className="font-medium text-center">Document Expiry Dates</h4>
                <div className="grid grid-cols-1 gap-4">
                    <DatePickerField name="airworthinessDoc.expiryDate" label="Certificate of Airworthiness" urlFieldName="airworthinessDoc.url" fileFieldName="airworthinessDoc.file" />
                    <DatePickerField name="insuranceDoc.expiryDate" label="Insurance" urlFieldName="insuranceDoc.url" fileFieldName="insuranceDoc.file" />
                    <DatePickerField name="releaseToServiceDoc.expiryDate" label="Release to Service" urlFieldName="releaseToServiceDoc.url" fileFieldName="releaseToServiceDoc.file" />
                    <DatePickerField name="registrationDoc.expiryDate" label="Certificate of Registration" urlFieldName="registrationDoc.url" fileFieldName="registrationDoc.file" />
                    <DatePickerField name="massAndBalanceDoc.expiryDate" label="Mass & Balance" urlFieldName="massAndBalanceDoc.url" fileFieldName="massAndBalanceDoc.file" />
                    <DatePickerField name="radioLicenseDoc.expiryDate" label="Radio Station License" urlFieldName="radioLicenseDoc.url" fileFieldName="radioLicenseDoc.file" />
                </div>
            </div>
        </ScrollArea>
        <div className="md:col-span-2 flex justify-end items-center pt-4">
          <Button type="submit">{initialData ? 'Save Changes' : 'Add Aircraft'}</Button>
        </div>
      </form>
    </Form>

    <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>AI Aircraft Scanner</DialogTitle>
                <DialogDescription>
                  {scanMode === 'registration' && 'Capture an image of the aircraft registration number.'}
                  {scanMode === 'hobbs' && 'Capture an image of the Hobbs meter.'}
                </DialogDescription>
            </DialogHeader>
            {scanMode && <AircraftInfoScanner scanMode={scanMode} onSuccess={handleScanSuccess} />}
        </DialogContent>
    </Dialog>

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
