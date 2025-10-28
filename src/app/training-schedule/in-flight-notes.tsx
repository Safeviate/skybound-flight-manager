
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

interface InFlightNotesProps {
  bookingId: string;
}

export function InFlightNotes({ bookingId }: InFlightNotesProps) {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const debouncedNotes = useDebounce(notes, 500); // Debounce saves by 500ms
  const { toast } = useToast();

  // Load notes from local storage on initial render
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(`inflight-notes-${bookingId}`);
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
      console.warn('Could not read in-flight notes from local storage.');
    }
  }, [bookingId]);

  // Save notes to local storage whenever debouncedNotes changes
  useEffect(() => {
    if (debouncedNotes !== undefined) {
      setIsSaving(true);
      try {
        localStorage.setItem(`inflight-notes-${bookingId}`, debouncedNotes);
        // Simulate a save operation
        setTimeout(() => {
          setIsSaving(false);
        }, 300);
      } catch (error) {
        console.error('Could not save in-flight notes to local storage.', error);
        toast({
          variant: 'destructive',
          title: 'Save Failed',
          description: 'Could not save notes. Your device storage may be full.',
        });
        setIsSaving(false);
      }
    }
  }, [debouncedNotes, bookingId, toast]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <div className="flex items-center justify-between">
        <Label htmlFor="in-flight-notes" className="text-lg font-semibold">
          In-Flight Notes
        </Label>
        {isSaving ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Save className="h-4 w-4" />
            <span>Saved</span>
          </div>
        )}
      </div>
      <Textarea
        id="in-flight-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Jot down notes, observations, and maneuvers covered during the flight..."
        className="min-h-[300px] text-base"
      />
      <p className="text-xs text-muted-foreground">
        Notes are saved automatically to this device and can be finalized during the post-flight debrief.
      </p>
    </div>
  );
}
