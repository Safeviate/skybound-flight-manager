
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readHobbsFromImage } from '@/ai/flows/read-hobbs-from-image-flow';
import { readRegistrationFromImage } from '@/ai/flows/read-registration-from-image-flow';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface AircraftInfoScannerProps {
  onSuccess: (data: { registration?: string; hobbs?: number }) => void;
}

export function AircraftInfoScanner({ onSuccess }: AircraftInfoScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ registration?: string; hobbs?: number }>({});
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
      setScanResult({});

      try {
        const [hobbsResult, regResult] = await Promise.allSettled([
          readHobbsFromImage({ photoDataUri: dataUrl }),
          readRegistrationFromImage({ photoDataUri: dataUrl }),
        ]);

        const newResult: { registration?: string; hobbs?: number } = {};
        if (hobbsResult.status === 'fulfilled' && hobbsResult.value.hobbsValue) {
          newResult.hobbs = hobbsResult.value.hobbsValue;
        }
        if (regResult.status === 'fulfilled' && regResult.value.registration) {
          newResult.registration = regResult.value.registration;
        }
        
        setScanResult(newResult);

      } catch (error) {
        console.error("AI scan failed:", error);
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not read data from the image.' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setScanResult({});
  };

  const handleConfirm = () => {
    onSuccess(scanResult);
  };

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
        <Image src={capturedImage} alt="Captured aircraft info" width={400} height={225} className="rounded-md w-full" />
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground h-24">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Analyzing...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-semibold text-center">AI Scan Results</h4>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-2 border rounded-md">
                    <p className="text-sm text-muted-foreground">Registration</p>
                    <p className="text-lg font-bold">{scanResult.registration || 'Not found'}</p>
                </div>
                 <div className="p-2 border rounded-md">
                    <p className="text-sm text-muted-foreground">Hobbs Hours</p>
                    <p className="text-lg font-bold">{scanResult.hobbs?.toFixed(1) || 'Not found'}</p>
                </div>
            </div>
            <Separator />
            <div className="flex justify-between">
                <Button variant="outline" onClick={handleRetry}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Recapture
                </Button>
                <Button onClick={handleConfirm} disabled={Object.keys(scanResult).length === 0}>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm & Use
                </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
      <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
        <Camera className="mr-2 h-4 w-4" />
        Capture Image
      </Button>
    </div>
  );
}
