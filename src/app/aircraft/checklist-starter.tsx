

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import type { Aircraft } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';

interface ChecklistStarterProps {
  aircraftList: Aircraft[];
  onAircraftSelected: (aircraftId: string | null) => void;
}

export function ChecklistStarter({
  aircraftList,
  onAircraftSelected,
}: ChecklistStarterProps) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        How would you like to start the checklist?
      </p>
      <div className={"flex justify-center"}>
        <Button
          variant="outline"
          className="h-24 flex-col"
          onClick={() => setIsSelectorOpen(true)}
        >
          <List className="h-8 w-8 mb-2" />
          Select Manually
        </Button>
      </div>

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
