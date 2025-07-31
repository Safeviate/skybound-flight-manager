
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
import { CalendarIcon, Camera, Loader2, RotateCcw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import type { Aircraft, User, Checklist, ChecklistItem } from '@/lib/types';
import { getNextService } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { readHobbsFromImage } from '@/ai/flows/read-hobbs-from-image-flow';
import { readRegistrationFromImage } from '@/ai/flows/read-registration-from-image-flow';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


const AiCameraReader = ({
  onValueRead,
  aiFlow,
  title,
  description,
}: {
  onValueRead: (value: string | number) => void;
  aiFlow: (input: any) => Promise<any>;
  title: string;
  description: string;
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const getCameraPermission = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setHasCameraPermission(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setHasCameraPermission(true);
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
            }
        };
        getCameraPermission();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = async () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedImage(dataUrl);
            setIsLoading(true);
            try {
                const result = await aiFlow({ photoDataUri: dataUrl });
                const value = result.registration || result.hobbsValue;
                onValueRead(value);
            } catch (error) {
                console.error("AI reading failed:", error);
                toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not read the value from the image.' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRetry = () => {
        setCapturedImage(null);
    };

    if (hasCameraPermission === false) {
        return <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access to use this feature.</AlertDescription></Alert>;
    }

    if (capturedImage) {
        return (
             <div className="space-y-4">
                <Image src={capturedImage} alt="Captured image" width={300} height={150} className="rounded-md w-full" />
                {isLoading && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        <span>Analyzing...</span>
                    </div>
                )}
                 <Button variant="outline" className="w-full" onClick={handleRetry}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Recapture
                </Button>
            </div>
        )
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
                <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                    <Camera className="mr-2 h-4 w-4" />
                    Capture & Analyze
                </Button>
            </div>
        </>
    );
};


const aircraftFormSchema = z.object({
  tailNumber: z.string().min(2, {
    message: 'Registration must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  status: z.enum(['Available', 'In Maintenance', 'Booked'], {
      required_error: 'Please select a status.'
  }),
  hours: z.coerce.number().min(0, {
      message: "Hours must be a positive number.",
  }),
  airworthinessExpiry: z.date().optional(),
  insuranceExpiry: z.date().optional(),
  certificateOfReleaseToServiceExpiry: z.date().optional(),
  certificateOfRegistrationExpiry: z.date().optional(),
  massAndBalanceExpiry: z.date().optional(),
  radioStationLicenseExpiry: z.date().optional(),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

interface NewAircraftFormProps {
    onAircraftAdded: (newAircraft: Aircraft) => void;
}

export function NewAircraftForm({ onAircraftAdded }: NewAircraftFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [isRegCameraOpen, setIsRegCameraOpen] = useState(false);
  const [isHobbsCameraOpen, setIsHobbsCameraOpen] = useState(false);
  
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
        tailNumber: '',
        model: '',
        status: 'Available',
        hours: 0,
    }
  });

  useEffect(() => {
    if (!company) return;

    const fetchUsers = async () => {
        const usersQuery = query(collection(db, `companies/${company.id}/users`));
        const usersSnapshot = await getDocs(usersQuery);
        setUsers(usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User)));
    };

    fetchUsers();
  }, [company]);

  const assignStandardChecklists = async (aircraftId: string) => {
      if (!company) return;
      
      try {
          const templatesRef = collection(db, `companies/${company.id}/checklist-templates`);
          const templatesSnapshot = await getDocs(templatesRef);
          const allTemplates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));

          const standardTemplates = allTemplates.filter(t => 
              t.title.toLowerCase().includes('pre-flight') || 
              t.title.toLowerCase().includes('post-flight')
          );
          
          if (standardTemplates.length === 0) {
              toast({ variant: 'destructive', title: 'No Standard Templates Found', description: 'Could not find master "Pre-Flight" or "Post-Flight" checklists to assign.'});
              return;
          }

          const assignedChecklistsRef = collection(db, `companies/${company.id}/checklists`);
          for (const template of standardTemplates) {
              const newChecklistForAircraft: Omit<Checklist, 'id'> = {
                  ...template,
                  aircraftId: aircraftId,
                  templateId: template.id,
              };
              await addDoc(assignedChecklistsRef, newChecklistForAircraft);
          }
           toast({
              title: 'Standard Checklists Assigned',
              description: `Assigned ${standardTemplates.length} standard checklist(s) to the new aircraft.`
            });

      } catch (error) {
          console.error('Error assigning standard checklists:', error);
           toast({ variant: 'destructive', title: 'Checklist Assignment Failed', description: 'Could not automatically assign standard checklists.'});
      }
  };

  async function onSubmit(data: AircraftFormValues) {
    if (!company) {
        toast({ variant: 'destructive', title: 'Error', description: 'No company context found.' });
        return;
    }
    const id = data.tailNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const aircraftRef = doc(db, `companies/${company.id}/aircraft`, id);

    const nextService = getNextService(data.hours);

    const newAircraft: Aircraft = {
        ...data,
        id,
        companyId: company.id,
        airworthinessExpiry: data.airworthinessExpiry ? format(data.airworthinessExpiry, 'yyyy-MM-dd') : '',
        insuranceExpiry: data.insuranceExpiry ? format(data.insuranceExpiry, 'yyyy-MM-dd') : '',
        certificateOfReleaseToServiceExpiry: data.certificateOfReleaseToServiceExpiry ? format(data.certificateOfReleaseToServiceExpiry, 'yyyy-MM-dd') : '',
        certificateOfRegistrationExpiry: data.certificateOfRegistrationExpiry ? format(data.certificateOfRegistrationExpiry, 'yyyy-MM-dd') : '',
        massAndBalanceExpiry: data.massAndBalanceExpiry ? format(data.massAndBalanceExpiry, 'yyyy-MM-dd') : '',
        radioStationLicenseExpiry: data.radioStationLicenseExpiry ? format(data.radioStationLicenseExpiry, 'yyyy-MM-dd') : '',
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
        location: 'KPAO', // Default location, can be changed later
    };

    try {
        await setDoc(aircraftRef, newAircraft);
        
        await assignStandardChecklists(id);

        onAircraftAdded(newAircraft);
        toast({
          title: 'Aircraft Added',
          description: `Aircraft ${data.tailNumber} has been added.`,
        });
        form.reset();
    } catch (error) {
        console.error("Error adding aircraft:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add aircraft to the database.' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField
            control={form.control}
            name="tailNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tail Number</FormLabel>
                <div className="flex items-center gap-2">
                    <FormControl>
                        <Input placeholder="N12345" {...field} />
                    </FormControl>
                    <Dialog open={isRegCameraOpen} onOpenChange={setIsRegCameraOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" type="button" size="icon"><Camera className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <AiCameraReader
                                title="Scan Tail Number"
                                description="Position the aircraft's tail number in the frame and capture."
                                aiFlow={readRegistrationFromImage}
                                onValueRead={(value) => {
                                    form.setValue('tailNumber', String(value));
                                    setIsRegCameraOpen(false);
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                    <Input placeholder="Cessna 172 Skyhawk" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Maintenance">In Maintenance</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Hobbs Hours</FormLabel>
                 <div className="flex items-center gap-2">
                    <FormControl>
                        <Input type="number" placeholder="1250.5" {...field} />
                    </FormControl>
                    <Dialog open={isHobbsCameraOpen} onOpenChange={setIsHobbsCameraOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" type="button" size="icon"><Camera className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <AiCameraReader
                                title="Scan Hobbs Meter"
                                description="Position the Hobbs meter in the frame and capture."
                                aiFlow={readHobbsFromImage}
                                onValueRead={(value) => {
                                    form.setValue('hours', Number(value));
                                    setIsHobbsCameraOpen(false);
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                 </div>
                <FormMessage />
                </FormItem>
            )}
            />
        
            <FormField
                control={form.control}
                name="airworthinessExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Airworthiness Expiry</FormLabel>
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
                name="insuranceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Insurance Expiry</FormLabel>
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
                name="certificateOfReleaseToServiceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Certificate of Release to Service Expiry</FormLabel>
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
                name="certificateOfRegistrationExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Certificate of Registration Expiry</FormLabel>
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
                name="massAndBalanceExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Mass and Balance Expiry</FormLabel>
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
                name="radioStationLicenseExpiry"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Radio Station License Expiry</FormLabel>
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

        <div className="flex justify-end">
            <Button type="submit">Add Aircraft</Button>
        </div>
      </form>
    </Form>
  );
}
