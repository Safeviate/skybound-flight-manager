
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Bot, Camera, Check, FileCheck, Plane, Hash, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AircraftInfoScanner } from '../aircraft/aircraft-info-scanner';
import Image from 'next/image';
import { Input } from '@/components/ui/input';


const checklistSchema = z.object({
  registration: z.string().min(1, { message: "Aircraft registration scan is required." }),
  hobbs: z.coerce.number().min(0.1, { message: "Hobbs meter scan is required." }),
  leftSidePhoto: z.string().min(1, { message: "Photo of the left side is required." }),
  rightSidePhoto: z.string().min(1, { message: "Photo of the right side is required." }),
  checklistOnboard: z.boolean().refine(val => val === true, { message: "You must confirm the checklist is onboard." }),
  fomOnboard: z.boolean().refine(val => val === true, { message: "You must confirm the Flight Operations Manual is onboard." }),
  report: z.string().optional(),
});

type ChecklistFormValues = z.infer<typeof checklistSchema>;

export function PreFlightChecklistForm() {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'registration' | 'hobbs' | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'leftSidePhoto' | 'rightSidePhoto' | null>(null);

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
        registration: '',
        hobbs: 0,
        leftSidePhoto: '',
        rightSidePhoto: '',
        checklistOnboard: false,
        fomOnboard: false,
        report: '',
    }
  });

  const { setValue, watch } = form;
  const watchedValues = watch();

  const handleScanSuccess = (data: { registration?: string; hobbs?: number }) => {
    if (scanMode === 'registration' && data.registration) {
      setValue('registration', data.registration, { shouldValidate: true });
    }
    if (scanMode === 'hobbs' && data.hobbs) {
      setValue('hobbs', data.hobbs, { shouldValidate: true });
    }
    setIsScannerOpen(false);
  };
  
  const handlePhotoSuccess = (data: { registration?: string; hobbs?: number }) => {
    // This is a workaround as the scanner component is being reused
    // It returns a data URL in the `registration` field
    if (photoTarget && data.registration) {
        setValue(photoTarget, data.registration, { shouldValidate: true });
    }
    setIsCameraOpen(false);
  }

  const openScanner = (mode: 'registration' | 'hobbs') => {
    setScanMode(mode);
    setIsScannerOpen(true);
  };

  const openCamera = (target: 'leftSidePhoto' | 'rightSidePhoto') => {
    setPhotoTarget(target);
    setIsCameraOpen(true);
  }
  
  const onSubmit = (data: ChecklistFormValues) => {
    console.log(data);
    toast({
        title: "Checklist Submitted",
        description: "The pre-flight checklist has been successfully submitted.",
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Pre-Flight Checklist</CardTitle>
                <CardDescription>Complete all items before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 {/* AI Camera Scans */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="registration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Aircraft Registration</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="Not Scanned" {...field} readOnly className="flex-1" />
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" onClick={() => openScanner('registration')}>
                                            <Bot className="mr-2" /> Scan
                                        </Button>
                                    </DialogTrigger>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="hobbs"
                        render={({ field }) => (
                             <FormItem>
                                <FormLabel>Hobbs Meter</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Hash className="h-5 w-5 text-muted-foreground" />
                                    <Input type="number" placeholder="Not Scanned" {...field} readOnly className="flex-1" />
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" onClick={() => openScanner('hobbs')}>
                                            <Bot className="mr-2" /> Scan
                                        </Button>
                                    </DialogTrigger>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                 {/* Standard Camera Photos */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="leftSidePhoto"
                        render={({ field }) => (
                             <FormItem>
                                <FormLabel>Left Side of Aircraft</FormLabel>
                                {watchedValues.leftSidePhoto ? (
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-green-500">Photo captured</span>
                                        <Button type="button" size="sm" variant="outline" onClick={() => openCamera('leftSidePhoto')}>Retake</Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" className="w-full" onClick={() => openCamera('leftSidePhoto')}>
                                        <Camera className="mr-2" /> Take Photo
                                    </Button>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="rightSidePhoto"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Right Side of Aircraft</FormLabel>
                                {watchedValues.rightSidePhoto ? (
                                     <div className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-green-500">Photo captured</span>
                                        <Button type="button" size="sm" variant="outline" onClick={() => openCamera('rightSidePhoto')}>Retake</Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" className="w-full" onClick={() => openCamera('rightSidePhoto')}>
                                        <Camera className="mr-2" /> Take Photo
                                    </Button>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>

                {/* Document Checks */}
                <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium text-sm flex items-center gap-2"><FileCheck className="h-4 w-4"/> Document Checks</h4>
                     <FormField
                        control={form.control}
                        name="checklistOnboard"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-normal">Aircraft Checklist / POH onboard</FormLabel>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="fomOnboard"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-normal">Flight Operations Manual onboard</FormLabel>
                            </FormItem>
                        )}
                    />
                </div>

                {/* Anything to Report */}
                <FormField
                    control={form.control}
                    name="report"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Anything to Report?</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Note any defects, issues, or observations..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full">Submit Pre-Flight Checklist</Button>
            </CardFooter>
        </Card>
        
        {/* Dialog for AI Scanner */}
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
        
        {/* Dialog for Standard Camera */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Standard Camera Capture</DialogTitle>
                    <DialogDescription>
                        {photoTarget === 'leftSidePhoto' && 'Take a clear photo of the left side of the aircraft.'}
                        {photoTarget === 'rightSidePhoto' && 'Take a clear photo of the right side of the aircraft.'}
                    </DialogDescription>
                </DialogHeader>
                 {/* Reusing scanner component - it will act as a normal camera and return a dataURL */}
                <AircraftInfoScanner scanMode={'registration'} onSuccess={handlePhotoSuccess} />
            </DialogContent>
        </Dialog>
      </form>
    </Form>
  )
}
