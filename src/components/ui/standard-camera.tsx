
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StandardCameraProps {
  onSuccess: (dataUrl: string) => void;
}

export function StandardCamera({ onSuccess }: StandardCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
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

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      const maxWidth = 800; // Reduced from 1280
      const scale = maxWidth / video.videoWidth;
      const finalWidth = video.videoWidth > maxWidth ? maxWidth : video.videoWidth;
      const finalHeight = video.videoWidth > maxWidth ? video.videoHeight * scale : video.videoHeight;

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, finalWidth, finalHeight);

      // Use JPEG for better compression of photos, with a quality of 50%
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      onSuccess(dataUrl);
    }
  };

  if (hasCameraPermission === false) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Camera Access Required</AlertTitle>
        <AlertDescription>Please allow camera access in your browser settings to use this feature.</AlertDescription>
      </Alert>
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
