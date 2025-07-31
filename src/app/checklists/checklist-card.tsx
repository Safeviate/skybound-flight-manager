
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Checklist, ChecklistItem, Aircraft, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Check, Bot, Loader2, RotateCcw } from 'lucide-react';
import { readHobbsFromImage } from '@/ai/flows/read-hobbs-from-image-flow';
import Image from 'next/image';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onItemToggle: (checklist: Checklist) => void;
  onItemValueChange: (checklistId: string, itemId: string, value: string) => void;
  onUpdate: (checklist: Checklist, hobbsValue?: number) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: Checklist) => void;
}

const HobbsReader = ({ onHobbsRead, aircraft }: { onHobbsRead: (value: number) => void, aircraft: Aircraft }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hobbsValue, setHobbsValue] = useState<number | null>(null);
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
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };
        getCameraPermission();
         return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [toast]);

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
                const result = await readHobbsFromImage({ photoDataUri: dataUrl });
                const newHobbs = result.hobbsValue;
                if (newHobbs < aircraft.hours) {
                    toast({
                        variant: 'destructive',
                        title: "Hobbs Reading Invalid",
                        description: `The read value (${newHobbs}) is less than the current aircraft hours (${aircraft.hours}). Please try again.`
                    });
                     handleRetry();
                } else {
                    setHobbsValue(newHobbs);
                    onHobbsRead(newHobbs);
                }

            } catch (error) {
                console.error("AI Hobbs reading failed:", error);
                toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not read the Hobbs meter from the image.'});
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handleRetry = () => {
        setCapturedImage(null);
        setHobbsValue(null);
    }

    if (hasCameraPermission === false) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
            </Alert>
        );
    }
    
    if (capturedImage) {
        return (
            <div className="space-y-4">
                <Image src={capturedImage} alt="Captured Hobbs Meter" width={300} height={150} className="rounded-md w-full" />
                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        <span>Analyzing...</span>
                    </div>
                ) : hobbsValue !== null ? (
                    <div className="space-y-2">
                        <p className="font-semibold text-center">AI Read Value:</p>
                        <p className="text-3xl font-bold text-center text-primary">{hobbsValue.toFixed(1)}</p>
                        <Button variant="outline" className="w-full" onClick={handleRetry}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Recapture
                        </Button>
                    </div>
                ) : (
                    <Button onClick={handleRetry} variant="outline" className="w-full">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Capture Failed, Try Again
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
            <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                <Camera className="mr-2 h-4 w-4" />
                Capture & Analyze Hobbs
            </Button>
        </div>
    );
};


export function ChecklistCard({
  checklist,
  aircraft,
  onItemToggle,
  onItemValueChange,
  onUpdate,
  onReset,
}: ChecklistCardProps) {

  const [hobbsValue, setHobbsValue] = React.useState<number | undefined>();

  const handleToggle = (itemId: string) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onItemToggle({ ...checklist, items: updatedItems });
  };
  
  const handleHobbsRead = (value: number) => {
    setHobbsValue(value);
    const hobbsItem = checklist.items.find(i => i.type === 'Confirm postflight hobbs');
    if (hobbsItem) {
        handleToggle(hobbsItem.id);
    }
  };

  const handleValueChange = (itemId: string, value: string) => {
    onItemValueChange(checklist.id, itemId, value);
  };
  
  const hobbsItem = checklist.items.find(item => item.type === 'Confirm postflight hobbs');

  const isComplete = checklist.items.every(item => item.completed);

  return (
    <Card>
        <CardContent className="space-y-4 pt-6">
            {checklist.items.map(item => (
            <div key={item.id} className="space-y-2">
                {item.type === 'Confirm postflight hobbs' && aircraft ? (
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-semibold mb-2">{item.text}</h4>
                        <HobbsReader onHobbsRead={handleHobbsRead} aircraft={aircraft} />
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id={`${checklist.id}-${item.id}`}
                            checked={item.completed}
                            onCheckedChange={() => handleToggle(item.id)}
                        />
                        <Label htmlFor={`${checklist.id}-${item.id}`} className="flex-1">
                            {item.text}
                        </Label>
                    </div>
                )}
            </div>
            ))}
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => onReset(checklist.id)}>
            Reset
            </Button>
            <Button onClick={() => onUpdate(checklist, hobbsValue)} disabled={!isComplete}>
            Submit Checklist
            </Button>
        </CardFooter>
    </Card>
  );
}
