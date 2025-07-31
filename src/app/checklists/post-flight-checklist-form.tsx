
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Bot, Camera, Plane, Hash, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AircraftInfoScanner } from '../aircraft/aircraft-info-scanner';
import { Input } from '@/components/ui/input';
import type { Aircraft } from '@/lib/types';


const checklistSchema = z.object({
  hobbs: z.coerce.number().min(0.1, { message: "Hobbs meter scan is required." }),
  leftSidePhoto: z.string().min(1, { message: "Photo of the left side is required." }),
  rightSidePhoto: z.string().min(1, { message: "Photo of the right side is required." }),
  report: z.string().optional(),
  defectPhoto: z.string().optional(),
});

export type PostFlightChecklistFormValues = z.infer<typeof checklistSchema>;

interface PostFlightChecklistFormProps {
    aircraft: Aircraft;
    onSuccess: (data: PostFlightChecklistFormValues) => void;
}

export function PostFlightChecklistForm({ aircraft, onSuccess }: PostFlightChecklistFormProps) {
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<'leftSidePhoto' | 'rightSidePhoto' | 'defectPhoto' | null>(null);

  const form = useForm<PostFlightChecklistFormValues>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
        hobbs: 0,
        leftSidePhoto: '',
        rightSidePhoto: '',
        report: '',
        defectPhoto: '',
    }
  });

  const { setValue, watch } = form;
  const watchedValues = watch();

  const handleScanSuccess = (data: { registration?: string; hobbs?: number }) => {
    if (data.hobbs) {
      setValue('hobbs', data.hobbs, { shouldValidate: true });
    }
    setIsScannerOpen(false);
  };
  
  const handlePhotoSuccess = (data: { registration?: string; hobbs?: number }) => {
    if (photoTarget && data.registration) {
        setValue(photoTarget, data.registration, { shouldValidate: true });
    }
    setIsCameraOpen(false);
  }

  const openCamera = (target: 'leftSidePhoto' | 'rightSidePhoto' | 'defectPhoto') => {
    setPhotoTarget(target);
    setIsCameraOpen(true);
  }
  
  const onSubmit = (data: PostFlightChecklistFormValues) => {
    onSuccess(data);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Post-Flight Checklist</CardTitle>
                <CardDescription>Complete all items for {aircraft.tailNumber} before submitting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="hobbs"
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Closing Hobbs Meter</FormLabel>
                            <div className="flex items-center gap-2">
                                <Hash className="h-5 w-5 text-muted-foreground" />
                                <Input type="number" step="0.1" placeholder="Not Scanned" {...field} readOnly className="flex-1" />
                                <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                                    <Bot className="mr-2" /> Scan
                                </Button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
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

                <FormField
                    control={form.control}
                    name="defectPhoto"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Photo of Defect (Optional)</FormLabel>
                            {watchedValues.defectPhoto ? (
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-green-500" />
                                    <span className="text-sm text-green-500">Photo captured</span>
                                    <Button type="button" size="sm" variant="outline" onClick={() => openCamera('defectPhoto')}>Retake</Button>
                                </div>
                            ) : (
                                <Button type="button" variant="outline" className="w-full" onClick={() => openCamera('defectPhoto')}>
                                    <Camera className="mr-2" /> Take Photo of Defect
                                </Button>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full">Submit Post-Flight Checklist</Button>
            </CardFooter>
        </Card>
        
        <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>AI Hobbs Scanner</DialogTitle>
                    <DialogDescription>
                        Capture a clear image of the Hobbs meter.
                    </DialogDescription>
                </DialogHeader>
                <AircraftInfoScanner scanMode="hobbs" onSuccess={handleScanSuccess} />
            </DialogContent>
        </Dialog>
        
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
                <AircraftInfoScanner scanMode={'registration'} onSuccess={handlePhotoSuccess} />
            </DialogContent>
        </Dialog>
      </form>
    </Form>
  )
}
