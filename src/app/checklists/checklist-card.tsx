
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Aircraft, Checklist, ChecklistItem } from '@/lib/types';
import { RotateCcw, CheckCircle, MapPin, Loader2, Edit, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getDistance } from '@/lib/utils.tsx';
import { airportData } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onItemToggle: (checklist: Checklist) => void;
  onUpdate: (checklist: Checklist) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: Checklist) => void;
}

type LocationStatus = 'idle' | 'checking' | 'verified' | 'error';

export function ChecklistCard({ checklist, aircraft, onItemToggle, onUpdate, onReset, onEdit }: ChecklistCardProps) {
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [isEditing, setIsEditing] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState<Checklist>(checklist);
  const { toast } = useToast();

  const handleItemToggle = (itemId: string) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onItemToggle({ ...checklist, items: updatedItems });
  };

  const completedItems = useMemo(() => checklist.items.filter(item => item.completed).length, [checklist.items]);
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const isComplete = progress === 100;
  const isPreFlight = checklist.category === 'Pre-Flight';

  const handleVerifyLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Geolocation is not supported by your browser.' });
      setLocationStatus('error');
      return;
    }

    setLocationStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        const airport = airportData.find(a => a.id === aircraft?.location);

        if (!airport) {
          toast({ variant: 'destructive', title: 'Could not determine aircraft location.' });
          setLocationStatus('error');
          return;
        }

        const distance = getDistance(userCoords, airport.coords);
        
        if (distance <= 1) { // 1 km radius
          toast({ title: 'Location Verified', description: 'You are at the airport. You can now submit.' });
          setLocationStatus('verified');
        } else {
          toast({ variant: 'destructive', title: 'Location Check Failed', description: `You are ${distance.toFixed(1)} km away. You must be at the airport to submit a pre-flight checklist.` });
          setLocationStatus('error');
        }
      },
      (error) => {
        let message = 'An unknown error occurred.';
        if (error.code === error.PERMISSION_DENIED) {
            message = 'You must allow location access to submit the checklist.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is unavailable.';
        }
        toast({ variant: 'destructive', title: 'Location Error', description: message });
        setLocationStatus('error');
      }
    );
  };
  
  const handleResetClick = () => {
      setLocationStatus('idle');
      onReset(checklist.id);
  }

  const getButtonState = () => {
      if (!isComplete) {
          return { text: 'Complete All Items', disabled: true, icon: <CheckCircle /> }
      }
      if (isPreFlight) {
        switch (locationStatus) {
            case 'idle':
            case 'error':
                return { text: 'Verify Location', disabled: false, onClick: handleVerifyLocation, icon: <MapPin /> };
            case 'checking':
                return { text: 'Verifying...', disabled: true, icon: <Loader2 className="animate-spin" /> };
            case 'verified':
                return { text: 'Submit & Complete', disabled: false, onClick: () => onUpdate(checklist), icon: <CheckCircle /> };
        }
      }
      return { text: 'Submit & Complete', disabled: false, onClick: () => onUpdate(checklist), icon: <CheckCircle /> };
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edits, revert to original
      setEditableChecklist(checklist);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = () => {
    onEdit(editableChecklist);
    setIsEditing(false);
    toast({
        title: "Checklist Updated",
        description: `"${editableChecklist.title}" has been saved.`
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableChecklist(prev => ({ ...prev, title: e.target.value }));
  };

  const handleItemTextChange = (itemId: string, newText: string) => {
    setEditableChecklist(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === itemId ? { ...item, text: newText } : item)
    }));
  };

  const handleAddItem = () => {
      const newItem: ChecklistItem = {
          id: `item-${Date.now()}`,
          text: 'New item',
          completed: false,
      };
      setEditableChecklist(prev => ({
          ...prev,
          items: [...prev.items, newItem]
      }));
  };

  const handleRemoveItem = (itemId: string) => {
      setEditableChecklist(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
      }));
  };

  const buttonState = getButtonState();

  if (isEditing) {
    return (
        <Card className="flex flex-col bg-muted/30">
        <CardHeader>
            <Input value={editableChecklist.title} onChange={handleTitleChange} className="text-lg font-semibold"/>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
            <div className="space-y-3 overflow-y-auto pr-2 md:max-h-60">
            {editableChecklist.items.map(item => (
                <div key={item.id} className="flex items-center space-x-2">
                    <Input
                        value={item.text}
                        onChange={(e) => handleItemTextChange(item.id, e.target.value)}
                        className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={editableChecklist.items.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
            </div>
             <Button variant="outline" size="sm" className="w-full" onClick={handleAddItem}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={handleEditToggle} className="w-full">
                <X className="mr-2 h-4 w-4" />
                Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
            </Button>
        </CardFooter>
        </Card>
    );
  }

  return (
    <Card className={`flex flex-col ${isComplete && locationStatus === 'verified' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{checklist.title}</CardTitle>
                <CardDescription>
                {completedItems} of {totalItems} items completed.
                </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleEditToggle}>
                <Edit className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Progress value={progress} />
        <div className="space-y-3 overflow-y-auto pr-2 md:max-h-60">
          {checklist.items.map(item => (
            <div key={item.id} className="flex items-center space-x-3">
              <Checkbox
                id={`${checklist.id}-${item.id}`}
                checked={item.completed}
                onCheckedChange={() => handleItemToggle(item.id)}
              />
              <Label
                htmlFor={`${checklist.id}-${item.id}`}
                className={`flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}
              >
                {item.text}
              </Label>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {isComplete && (
            <p className="text-xs text-center text-muted-foreground p-2 bg-muted rounded-md">
                By clicking "Submit", I confirm that I have completed this checklist in good faith and that all required documents are onboard as required by law.
            </p>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleResetClick} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
            </Button>
            <Button size="sm" onClick={buttonState.onClick} className="w-full" disabled={buttonState.disabled}>
                {buttonState.icon}
                {buttonState.text}
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
