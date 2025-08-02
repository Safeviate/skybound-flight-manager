
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
import { useState, useEffect } from 'react';
import { Bot, Camera, Check, FileCheck, Plane, Hash, Image as ImageIcon, AlertTriangle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import type { Aircraft } from '@/lib/types';
import { StandardCamera } from '@/components/ui/standard-camera';
import { Label } from '@/components/ui/label';


const checklistSchema = z.object({
  registration: z.string().min(1, { message: "Aircraft registration scan is required." }),
  hobbs: z.coerce.number().min(0.1, { message: "Hobbs meter reading is required." }),
  leftSidePhoto: z.string().min(1, { message: "Photo of the left side is required." }),
  rightSidePhoto: z.string().min(1, { message: "Photo of the right side is required." }),
  checklistOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  fomOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  airworthinessOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  insuranceOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  releaseToServiceOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  registrationOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  massAndBalanceOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  radioLicenseOnboard: z.boolean().refine(val => val === true, { message: "This must be checked."}),
  report: z.string().optional(),
  defectPhoto: z.string().optional(),
  bookingNumber: z.string().optional(),
});

export type PreFlightChecklistFormValues = z.infer<typeof checklistSchema>;

interface PreFlightChecklistFormProps {
    aircraft: Aircraft;
    onSuccess: (data: PreFlightChecklistFormValues) => void;
    onReportIssue: (aircraftId: string, issueDetails: { title: string, description: string }) => void;
}

export function PreFlightChecklistForm({ aircraft, onSuccess, onReportIssue }: PreFlightChecklistFormProps) {
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'leftSidePhoto' | 'rightSidePhoto' | 'defectPhoto' | null>(null);

  const form = useForm<PreFlightChecklistFormValues>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
        registration: aircraft.tailNumber,
        hobbs: aircraft.hours || 0,
        leftSidePhoto: '',
        rightSidePhoto: '',
        checklistOnboard: false,
        fomOnboard: false,
        airworthinessOnboard: false,
        insuranceOnboard: false,
        releaseToServiceOnboard: false,
        registrationOnboard: false,
        massAndBalanceOnboard: false,
        radioLicenseOnboard: false,
        report: '',
        defectPhoto: '',
    }
  });

  useEffect(() => {
    form.setValue('registration', aircraft.tailNumber);
    form.setValue('hobbs', aircraft.hours || 0);
  }, [aircraft, form]);


  const { setValue, watch, getValues } = form;
  const watchedValues = watch();
  
  const handlePhotoSuccess = (dataUrl: string) => {
    if (photoTarget) {
        setValue(photoTarget, dataUrl, { shouldValidate: true });
    }
    setIsCameraOpen(false);
  }

  const openCamera = (target: 'leftSidePhoto' | 'rightSidePhoto' | 'defectPhoto') => {
    setPhotoTarget(target);
    setIsCameraOpen(true);
  }
  
  const onSubmit = (data: PreFlightChecklistFormValues) => {
    onSuccess(data);
    form.reset();
  }
  
  const handleIssueSubmit = () => {
    const reportText = getValues("report");
    if (!reportText) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please describe the issue before submitting.'});
        return;
    }
    onReportIssue(aircraft.id, {
        title: `Defect on ${aircraft.tailNumber}`,
        description: reportText
    });
    // Clear the form fields after submission
    setValue('report', '');
    setValue('defectPhoto', '');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Pre-Flight Checklist</CardTitle>
                <CardDescription>Complete all items for {aircraft.tailNumber} before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="registration"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Aircraft Registration</FormLabel>
                                <div className="flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-muted-foreground" />
                                    <Input placeholder="Aircraft Registration" {...field} readOnly className="flex-1 bg-muted" />
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
                                    <Input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="Enter current Hobbs hours" 
                                        {...field} 
                                        onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                        className="flex-1" />
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
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="checklistOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Aircraft Checklist / POH</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="fomOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Flight Ops Manual</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="airworthinessOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Certificate of Airworthiness</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="insuranceOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Insurance Certificate</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="releaseToServiceOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Release to Service</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="registrationOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Certificate of Registration</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="massAndBalanceOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Mass and Balance</FormLabel><FormMessage/></FormItem>)} />
                        <FormField control={form.control} name="radioLicenseOnboard" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Radio Station License</FormLabel><FormMessage/></FormItem>)} />
                    </div>
                </div>

                 <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="font-medium">Defect Report</Label>
                    <FormField
                        control={form.control}
                        name="report"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea placeholder="Note any defects, issues, or observations..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="defectPhoto"
                        render={({ field }) => (
                            <FormItem>
                                {watchedValues.defectPhoto ? (
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5 text-green-500" />
                                        <span className="text-sm text-green-500">Defect photo captured</span>
                                        <Button type="button" size="sm" variant="link" onClick={() => openCamera('defectPhoto')}>Retake photo</Button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" size="sm" onClick={() => openCamera('defectPhoto')}>
                                        <Camera className="mr-2 h-4 w-4" /> Add Photo of Defect
                                    </Button>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex justify-end">
                        <Button type="button" variant="destructive" onClick={handleIssueSubmit}>
                           <Send className="mr-2 h-4 w-4"/> Submit Issue Report
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full">Submit Pre-Flight Checklist</Button>
            </CardFooter>
        </Card>
        
        {/* Dialog for Standard Camera */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Standard Camera Capture</DialogTitle>
                    <DialogDescription>
                        {photoTarget === 'leftSidePhoto' && 'Take a clear photo of the left side of the aircraft.'}
                        {photoTarget === 'rightSidePhoto' && 'Take a clear photo of the right side of the aircraft.'}
                        {photoTarget === 'defectPhoto' && 'Take a clear photo of the reported defect or issue.'}
                    </DialogDescription>
                </DialogHeader>
                <StandardCamera onSuccess={handlePhotoSuccess} />
            </DialogContent>
        </Dialog>
      </form>
    </Form>
  )
}

    