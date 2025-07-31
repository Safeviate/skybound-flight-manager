
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Checklist, ChecklistItem, Aircraft, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Check, Bot, Loader2, RotateCcw } from 'lucide-react';
import { readHobbsFromImage } from '@/ai/flows/read-hobbs-from-image-flow';
import { readRegistrationFromImage } from '@/ai/flows/read-registration-from-image-flow';
import Image from 'next/image';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onUpdate: (checklist: Checklist, hobbsValue?: number, report?: string) => void;
}

const AiCameraScanner = ({ scanMode, onScan }: { scanMode: 'registration' | 'hobbs', onScan: (value: string | number) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scanResult, setScanResult] = useState<string | number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const getCameraPermission = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setHasCameraPermission(false);
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) videoRef.current.srcObject = stream;
                setHasCameraPermission(true);
            } catch (error) {
                setHasCameraPermission(false);
                toast({ variant: 'destructive', title: 'Camera Access Denied' });
            }
        };
        getCameraPermission();
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
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
                if (scanMode === 'registration') {
                    const result = await readRegistrationFromImage({ photoDataUri: dataUrl });
                    setScanResult(result.registration);
                    onScan(result.registration);
                } else if (scanMode === 'hobbs') {
                    const result = await readHobbsFromImage({ photoDataUri: dataUrl });
                    setScanResult(result.hobbsValue);
                    onScan(result.hobbsValue);
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not read data from the image.' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setScanResult(null);
    };

    if (hasCameraPermission === false) return <Alert variant="destructive"><AlertTitle>Camera Access Required</AlertTitle></Alert>;
    if (capturedImage) {
        return (
            <div className="space-y-4">
                <Image src={capturedImage} alt={`Captured ${scanMode}`} width={400} height={225} className="rounded-md w-full" />
                {isLoading && <div className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Analyzing...</div>}
                {scanResult !== null && !isLoading && (
                    <div className="text-center space-y-2">
                        <p className="text-lg font-bold text-primary">{scanResult}</p>
                         <Button onClick={handleRetry} variant="outline" size="sm" className="w-full">Recapture</Button>
                    </div>
                )}
                {scanResult === null && !isLoading && <Button onClick={handleRetry} variant="outline" className="w-full">Recapture</Button>}
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                <Camera className="mr-2 h-4 w-4" /> Scan {scanMode}
            </Button>
        </div>
    );
};

const PhotoCapture = ({ title, onCapture }: { title: string, onCapture: (dataUrl: string) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const { toast } = useToast();

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setCapturedImage(dataUrl);
            onCapture(dataUrl);
        }
    };
    
    useEffect(() => {
         const getCameraPermission = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (error) { toast({ variant: 'destructive', title: 'Camera Access Denied' }); }
        };
        if(!capturedImage) getCameraPermission();
    }, [capturedImage, toast]);

    if (capturedImage) {
        return (
             <div className="space-y-2">
                <Image src={capturedImage} alt={title} width={400} height={225} className="rounded-md w-full" />
                <Button variant="outline" onClick={() => setCapturedImage(null)} className="w-full">
                    <RotateCcw className="mr-2 h-4 w-4" /> Retake Photo
                </Button>
            </div>
        )
    }
    
    return (
        <div className="space-y-2">
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
            <Button onClick={handleCapture} className="w-full">
                <Camera className="mr-2 h-4 w-4" /> Take Photo of {title}
            </Button>
        </div>
    );
};

export function ChecklistCard({ checklist, aircraft, onUpdate }: ChecklistCardProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [reportText, setReportText] = useState('');
  const [hobbsValue, setHobbsValue] = useState<number | undefined>();
  const [localChecklist, setLocalChecklist] = useState<Checklist>(checklist);

  const handleStepComplete = (step: string, value: any) => {
    if (step === 'registration') {
        if (value !== aircraft?.tailNumber) {
            toast({ variant: 'destructive', title: "Incorrect Aircraft", description: `Scanned registration (${value}) does not match selected aircraft (${aircraft?.tailNumber}).` });
            return;
        }
    }
    setSteps(prev => ({ ...prev, [step]: true }));
    if (step === 'hobbs') setHobbsValue(value);
  };
  
  const handleItemToggle = (itemId: string, checked: boolean) => {
    const updatedItems = localChecklist.items.map(item =>
      item.id === itemId ? { ...item, completed: checked } : item
    );
    setLocalChecklist(prev => ({ ...prev, items: updatedItems }));
  };
  
  const docsAreComplete = localChecklist.items.every(i => i.completed);
  const isComplete = steps.registration && steps.leftPhoto && steps.rightPhoto && docsAreComplete && steps.hobbs;

  return (
    <Card>
        <CardContent className="pt-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            <ChecklistStep title="Step 1: Verify Aircraft Registration" isComplete={steps.registration}>
                <AiCameraScanner scanMode="registration" onScan={(val) => handleStepComplete('registration', val)} />
            </ChecklistStep>

            <ChecklistStep title="Step 2: Walkaround Photos" isComplete={steps.leftPhoto && steps.rightPhoto}>
                <div className="grid grid-cols-2 gap-4">
                    <PhotoCapture title="Left Side" onCapture={() => handleStepComplete('leftPhoto', true)} />
                    <PhotoCapture title="Right Side" onCapture={() => handleStepComplete('rightPhoto', true)} />
                </div>
            </ChecklistStep>

            <ChecklistStep title="Step 3: Confirm Onboard Documents" isComplete={docsAreComplete}>
                 {localChecklist.items.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox 
                            id={`${localChecklist.id}-${item.id}`} 
                            onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)} 
                            checked={item.completed}
                        />
                        <Label htmlFor={`${localChecklist.id}-${item.id}`} className="flex-1">{item.text}</Label>
                    </div>
                ))}
            </ChecklistStep>

            <ChecklistStep title="Step 4: Anything to report?" isComplete={true}>
                <Textarea placeholder="Enter any notes or snags here. This is optional." value={reportText} onChange={(e) => setReportText(e.target.value)} />
            </ChecklistStep>
            
            <ChecklistStep title="Step 5: Record Hobbs Meter" isComplete={!!steps.hobbs}>
                <AiCameraScanner scanMode="hobbs" onScan={(val) => handleStepComplete('hobbs', val)} />
            </ChecklistStep>
            
        </CardContent>
        <CardFooter>
            <Button onClick={() => onUpdate(localChecklist, hobbsValue, reportText)} disabled={!isComplete} className="w-full">
                Submit Checklist
            </Button>
        </CardFooter>
    </Card>
  );
}

const ChecklistStep = ({ title, isComplete, children }: { title: string, isComplete: boolean, children: React.ReactNode }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <CardTitle className="text-base">{title}</CardTitle>
                {isComplete && <Check className="h-6 w-6 text-green-600 bg-green-100 rounded-full p-1" />}
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {children}
            </CardContent>
        </Card>
    )
}
