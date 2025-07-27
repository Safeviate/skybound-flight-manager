

'use client';

import * as React from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SignaturePadProps {
  onSubmit: (signature: string) => void;
  className?: string;
}

export function SignaturePad({ onSubmit, className }: SignaturePadProps) {
  const sigCanvas = React.useRef<SignatureCanvas>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isSignatureEmpty, setIsSignatureEmpty] = React.useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsSignatureEmpty(true);
  };

  const handleSubmit = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signature = sigCanvas.current.toDataURL('image/png');
      onSubmit(signature);
    }
  };

  const handleBeginStroke = () => {
    setIsSignatureEmpty(false);
  }

  // Debounce function
  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  React.useEffect(() => {
    const resizeCanvas = () => {
        if (sigCanvas.current && containerRef.current) {
            const canvas: HTMLCanvasElement | null = sigCanvas.current.getCanvas();
            if (canvas) {
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const newWidth = containerRef.current.offsetWidth;
                // Set a max height for the canvas
                const newHeight = isMobile ? 200 : 150;
                
                canvas.width = newWidth * ratio;
                canvas.height = newHeight * ratio;
                canvas.getContext('2d')?.scale(ratio, ratio);
                sigCanvas.current.clear(); // Resizing clears the canvas, so we clear it explicitly
            }
        }
    };
    
    const debouncedResize = debounce(resizeCanvas, 250);
    
    // Initial resize
    resizeCanvas();
    
    window.addEventListener('resize', debouncedResize);
    return () => window.removeEventListener('resize', debouncedResize);
  }, [isMobile]);

  return (
    <div className={cn('flex w-full max-w-sm flex-col items-center gap-2', className)}>
      <div ref={containerRef} className="w-full rounded-lg border bg-background">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{ className: 'w-full h-auto' }}
          onBegin={handleBeginStroke}
        />
      </div>
      <div className="flex w-full justify-between">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
         <Button type="button" size="sm" onClick={handleSubmit} disabled={isSignatureEmpty}>
          <Check className="mr-2 h-4 w-4" />
          Submit Signature
        </Button>
      </div>
    </div>
  );
}
