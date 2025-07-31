
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, List } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AircraftInfoScanner } from './aircraft-info-scanner';
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface ChecklistStarterProps {
  aircraftList: Aircraft[];
  onAircraftSelected: (aircraftId: string | null) => void;
}

export function ChecklistStarter({
  aircraftList,
  onAircraftSelected,
}: ChecklistStarterProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { toast } = useToast();

  const handleScanSuccess = (data: { registration?: string; hobbs?: number }) => {
    setIsScannerOpen(false);
    if (data.registration) {
      const foundAircraft = aircraftList.find(
        (ac) => ac.tailNumber.toUpperCase() === data.registration?.toUpperCase()
      );
      if (foundAircraft) {
        onAircraftSelected(foundAircraft.id);
        toast({
          title: 'Aircraft Identified',
          description: `${foundAircraft.model} (${foundAircraft.tailNumber}) selected.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Aircraft Not Found',
          description: `No aircraft with registration "${data.registration}" found in your fleet.`,
        });
      }
    }
  };

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        How would you like to start the checklist?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Button
          variant="outline"
          className="h-24 flex-col"
          onClick={() => setIsScannerOpen(true)}
        >
          <Bot className="h-8 w-8 mb-2" />
          Scan Aircraft
        </Button>
        <Button
          variant="outline"
          className="h-24 flex-col"
          onClick={() => setIsSelectorOpen(true)}
        >
          <List className="h-8 w-8 mb-2" />
          Select Manually
        </Button>
      </div>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Aircraft Registration</DialogTitle>
            <DialogDescription>
              Point the camera at the aircraft's tail number.
            </DialogDescription>
          </DialogHeader>
          <AircraftInfoScanner scanMode="registration" onSuccess={handleScanSuccess} />
        </DialogContent>
      </Dialog>
      
       <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Aircraft Manually</DialogTitle>
            <DialogDescription>
              Choose an aircraft from the list to perform a checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
             <Select onValueChange={(value) => { onAircraftSelected(value); setIsSelectorOpen(false); }}>
                <SelectTrigger>
                    <SelectValue placeholder="Select an aircraft..." />
                </SelectTrigger>
                <SelectContent>
                    {aircraftList.map(ac => (
                        <SelectItem key={ac.id} value={ac.id}>
                            {ac.model} ({ac.tailNumber})
                        </SelectItem>
                    ))}
                </SelectContent>
             </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
