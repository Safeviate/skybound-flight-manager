
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Aircraft, Checklist, ChecklistItem, ChecklistItemType } from '@/lib/types';
import { RotateCcw, CheckCircle, Edit, Save, X, PlusCircle, Trash2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onItemToggle: (checklist: Checklist) => void;
  onItemValueChange: (checklistId: string, itemId: string, value: string) => void;
  onUpdate: (checklist: Checklist) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: Checklist) => void;
}

export function ChecklistCard({ checklist, aircraft, onItemToggle, onItemValueChange, onUpdate, onReset, onEdit }: ChecklistCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState<Checklist>(checklist);
  const { toast } = useToast();

  const handleItemToggleCheckbox = (itemId: string) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onItemToggle({ ...checklist, items: updatedItems });
  };
  
  const isItemCompleted = (item: ChecklistItem) => {
    if (item.type !== 'Checkbox') {
        return !!item.value;
    }
    return item.completed;
  }

  const completedItems = useMemo(() => checklist.items.filter(isItemCompleted).length, [checklist.items]);
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  const isComplete = progress === 100;

  const handleResetClick = () => {
      onReset(checklist.id);
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
          type: 'Checkbox',
          value: '',
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

  const renderItemInput = (item: ChecklistItem) => {
    switch(item.type) {
        case 'Checkbox':
            return (
                 <div key={item.id} className="flex items-center space-x-3">
                    <Checkbox
                        id={`${checklist.id}-${item.id}`}
                        checked={item.completed}
                        onCheckedChange={() => handleItemToggleCheckbox(item.id)}
                    />
                    <Label
                        htmlFor={`${checklist.id}-${item.id}`}
                        className={`flex-1 text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}
                    >
                        {item.text}
                    </Label>
                </div>
            );
        case 'Confirm preflight hobbs':
        case 'Confirm postflight hobbs':
        case 'Confirm premaintenance hobbs':
        case 'Confirm post maintenance hobbs':
             return (
                 <div key={item.id} className="space-y-2">
                    <Label htmlFor={`${checklist.id}-${item.id}`} className="text-sm">{item.text}</Label>
                    <Input 
                        id={`${checklist.id}-${item.id}`}
                        type="number" 
                        step="0.1"
                        value={item.value || ''}
                        onChange={(e) => onItemValueChange(checklist.id, item.id, e.target.value)}
                        placeholder="Enter Hobbs hours"
                    />
                 </div>
             );
        default:
            return null;
    }
  }


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
    <Card className={cn("flex flex-col", isComplete && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800')}>
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
        <div className="space-y-4 overflow-y-auto pr-2 md:max-h-60">
          {checklist.items.map(item => renderItemInput(item))}
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
            <Button size="sm" onClick={() => onUpdate(checklist)} className="w-full" disabled={!isComplete}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Submit & Complete
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
