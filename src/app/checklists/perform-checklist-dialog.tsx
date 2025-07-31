
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AuditChecklist, ChecklistItem, CompletedChecklist } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AircraftInfoScanner } from '../aircraft/aircraft-info-scanner';
import { format } from 'date-fns';

interface PerformChecklistDialogProps {
  template: AuditChecklist;
}

export function PerformChecklistDialog({ template }: PerformChecklistDialogProps) {
  const [completedItems, setCompletedItems] = useState<Record<string, { completed: boolean; value?: any }>>({});
  const { user, company } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize state when the template changes
    const initialState = template.items.reduce((acc, item) => {
      acc[item.id] = { completed: false, value: '' };
      return acc;
    }, {} as Record<string, { completed: boolean; value?: any }>);
    setCompletedItems(initialState);
  }, [template]);

  const handleItemChange = (itemId: string, completed: boolean, value?: any) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: { completed, value: value ?? prev[itemId].value },
    }));
  };

  const handleSubmit = async () => {
    if (!user || !company) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
      return;
    }

    const completedChecklist: Omit<CompletedChecklist, 'id'> = {
      templateId: template.id,
      templateTitle: template.title,
      userId: user.id,
      userName: user.name,
      companyId: company.id,
      dateCompleted: format(new Date(), 'yyyy-MM-dd'),
      items: Object.entries(completedItems).map(([id, result]) => ({
        itemId: id,
        itemText: template.items.find(i => i.id === id)?.text || 'Unknown Item',
        completed: result.completed,
        value: result.value,
      })),
    };

    try {
      await addDoc(collection(db, `companies/${company.id}/completed-checklists`), completedChecklist);
      toast({ title: 'Checklist Submitted', description: 'Your completed checklist has been saved.' });
      // The parent dialog will close itself
    } catch (error) {
      console.error("Error submitting checklist:", error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the checklist.' });
    }
  };

  const renderItemInput = (item: ChecklistItem) => {
    const { id, type, text } = item;
    const result = completedItems[id] || { completed: false, value: '' };

    switch (type) {
      case 'Checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={result.completed}
              onCheckedChange={(checked) => handleItemChange(id, !!checked)}
            />
            <Label htmlFor={id} className="font-normal">{text}</Label>
          </div>
        );
      case 'Textbox':
        return (
          <div>
            <Label htmlFor={id}>{text}</Label>
            <Textarea
              id={id}
              value={result.value || ''}
              onChange={(e) => handleItemChange(id, e.target.value !== '', e.target.value)}
              className="mt-2"
            />
          </div>
        );
      case 'AICamera-Registration':
      case 'AICamera-Hobbs':
        return (
          <div className="space-y-2">
            <Label>{text}</Label>
            {result.completed ? (
              <div className="p-2 border rounded-md bg-muted text-center font-semibold">
                {type === 'AICamera-Registration' ? `Registration: ${result.value}` : `Hobbs: ${result.value}`}
              </div>
            ) : (
              <AircraftInfoScanner
                scanMode={type === 'AICamera-Registration' ? 'registration' : 'hobbs'}
                onSuccess={(data) => handleItemChange(id, true, data.registration || data.hobbs)}
              />
            )}
          </div>
        );
      case 'StandardCamera':
        return (
          <div>
             <Label>{text}</Label>
             <p className="text-xs text-muted-foreground">Standard camera capture not yet implemented.</p>
          </div>
        );
      default:
        return <p>Unknown item type</p>;
    }
  };

  return (
    <>
        <ScrollArea className="h-[60vh] p-4 border rounded-md -mx-6 -my-2">
          <div className="space-y-6">
            {template.items.map(item => (
              <div key={item.id} className="p-4 rounded-lg bg-background border">
                {renderItemInput(item)}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button type="button" onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
    </>
  );
}
