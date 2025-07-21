
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, AlertTriangle } from 'lucide-react';
import jsQR from 'jsqr';

export default function ScanChecklistPage() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setScanError('Camera access was denied. Please enable camera permissions in your browser settings.');
      }
    };

    getCameraPermission();

    return () => {
        // Stop camera stream when component unmounts
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const scanQrCode = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            // QR code found, redirect
            router.push(`/checklists/start/${code.data}`);
            return; // Stop scanning
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanQrCode);
    };

    if (hasCameraPermission) {
        animationFrameId = requestAnimationFrame(scanQrCode);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hasCameraPermission, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Scan Checklist QR Code" />
      <main className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center bg-muted">
        <div className="w-full max-w-md p-4 bg-background rounded-lg shadow-lg relative">
          <h2 className="text-center text-lg font-semibold mb-4">Point your camera at a QR code</h2>
          <div className="relative aspect-square w-full overflow-hidden rounded-md border">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-8 border-primary/50 rounded-lg" />
          </div>
          {hasCameraPermission === false && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                {scanError || 'Please enable camera permissions in your browser settings to use this feature.'}
              </AlertDescription>
            </Alert>
          )}
           {hasCameraPermission === null && (
            <div className="flex items-center justify-center mt-4">
              <Camera className="mr-2 h-5 w-5 animate-pulse" />
              <p>Requesting camera access...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

