
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Checklist } from '@/lib/types';
import { RotateCcw, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';

interface ChecklistCardProps {
  checklist: Checklist;
  onItemToggle: (checklist: Checklist) => void;
  onUpdate: (checklist: Checklist) => void;
  onReset: (checklistId: string) => void;
}

export function ChecklistCard({ checklist, onItemToggle, onUpdate, onReset }: ChecklistCardProps) {
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

  return (
    <Card className={`flex flex-col ${isComplete ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}`}>
      <CardHeader>
        <CardTitle>{checklist.title}</CardTitle>
        <CardDescription>
          {completedItems} of {totalItems} items completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Progress value={progress} />
        <div className="space-y-3 md:max-h-60 overflow-y-auto pr-2">
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
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" size="sm" onClick={() => onReset(checklist.id)} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button size="sm" onClick={() => onUpdate(checklist)} className="w-full" disabled={!isComplete}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Submit & Complete
        </Button>
      </CardFooter>
    </Card>
  );
}
