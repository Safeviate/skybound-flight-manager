
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Aircraft, Checklist, ChecklistItem } from '@/lib/types';
import { RotateCcw, CheckCircle, Edit, Save, X, PlusCircle, Trash2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onItemToggle: (checklist: Checklist) => void;
  onUpdate: (checklist: Checklist, hobbs?: number) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: Checklist) => void;
}

export function ChecklistCard({ checklist, aircraft, onItemToggle, onUpdate, onReset, onEdit }: ChecklistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState<Checklist>(checklist);
  const [hobbsValue, setHobbsValue] = useState<string>(aircraft?.hours.toFixed(1) || '');
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
  const isMaintenance = checklist.category === 'Post-Maintenance';

  const handleResetClick = () => {
      onReset(checklist.id);
  }

  const getButtonState = () => {
      if (!isComplete) {
          return { text: 'Complete All Items', disabled: true, icon: <CheckCircle /> }
      }
      if (isMaintenance) {
        return { text: 'Submit & Complete Maintenance', disabled: false, onClick: () => onUpdate(checklist, parseFloat(hobbsValue)), icon: <Wrench /> }
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
    <Card className={`flex flex-col ${isComplete && !isMaintenance ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''} ${isComplete && isMaintenance ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}`}>
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
        {isMaintenance && isComplete && (
            <div className="space-y-2">
                <Label htmlFor="hobbs">Post-Maintenance Hobbs Hours</Label>
                <Input 
                    id="hobbs" 
                    type="number" 
                    value={hobbsValue} 
                    onChange={e => setHobbsValue(e.target.value)}
                    placeholder={aircraft?.hours.toFixed(1)}
                />
            </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {isComplete && !isMaintenance && (
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
