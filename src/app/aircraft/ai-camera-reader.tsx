
'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Camera, Loader2, RotateCcw, Check } from 'lucide-react';
import Image from 'next/image';

interface AiCameraReaderProps {
  onValueRead: (value: string | number) => void;
  aiFlow: (input: { photoDataUri: string }) => Promise<any>;
  isOpen: boolean;
}

export const AiCameraReader = ({ onValueRead, aiFlow, isOpen }: AiCameraReaderProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiResult, setAiResult] = useState<string | number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let stream: MediaStream | null = null;
        
        const getCameraPermission = async () => {
            if (!isOpen) {
                 if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                    videoRef.current.srcObject = null;
                }
                return;
            };

            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error("Camera not available");
                }
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [isOpen]);

    const handleCapture = async () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        
        let dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl.startsWith('data:image/png')) {
            dataUrl = 'data:image/png;base64,' + dataUrl.split(',')[1];
        }

        setCapturedImage(dataUrl);
        setIsLoading(true);
        setAiResult(null);

        try {
            const result = await aiFlow({ photoDataUri: dataUrl });
            setAiResult(result.registration || result.hobbsValue);
        } catch (error) {
            console.error("AI reading failed:", error);
            toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'Could not read value from image.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAccept = () => {
        if (aiResult !== null) onValueRead(aiResult);
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setAiResult(null);
    };
    
    if (hasCameraPermission === false) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>Please enable camera permissions in your browser settings.</AlertDescription>
            </Alert>
        );
    }
    
    return (
        <div className="space-y-4">
            {capturedImage ? (
                <div className="space-y-4">
                    <Image src={capturedImage} alt="Captured" width={300} height={150} className="rounded-md w-full" />
                    {isLoading && <div className="flex items-center justify-center gap-2"><Loader2 className="animate-spin"/>Analyzing...</div>}
                    {aiResult !== null && (
                        <div className="p-4 bg-muted rounded-lg space-y-3">
                            <p className="font-semibold text-center">AI Read Value: <span className="text-primary font-bold text-xl">{aiResult}</span></p>
                            <div className="flex justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={handleRetry}><RotateCcw className="mr-2"/>Recapture</Button>
                                <Button size="sm" onClick={handleAccept}><Check className="mr-2"/>Accept</Button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                    <Button onClick={handleCapture} disabled={!hasCameraPermission} className="w-full">
                        <Camera className="mr-2"/>Capture & Analyze
                    </Button>
                </>
            )}
        </div>
    );
};
