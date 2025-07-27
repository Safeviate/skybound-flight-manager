
'use client';

import * as React from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignaturePadProps {
  onEnd: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export function SignaturePad({ onEnd, width = 400, height = 200, className }: SignaturePadProps) {
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
    onEnd('');
  };

  const handleEndStroke = () => {
    if (sigCanvas.current) {
      // Get signature as data URL
      const signature = sigCanvas.current.toDataURL('image/png');
      onEnd(signature);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="rounded-lg border bg-background">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{ width, height, className: 'sigCanvas' }}
          onEnd={handleEndStroke}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
