
'use client';

import React from 'react';
import type { Checklist, ChecklistItem, Aircraft } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface ChecklistCardProps {
  checklist: Checklist;
  aircraft?: Aircraft;
  onItemToggle: (checklist: Checklist) => void;
  onItemValueChange: (checklistId: string, itemId: string, value: string) => void;
  onUpdate: (checklist: Checklist) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: Checklist) => void;
}

export function ChecklistCard({
  checklist,
  aircraft,
  onItemToggle,
  onItemValueChange,
  onUpdate,
  onReset,
}: ChecklistCardProps) {

  const handleToggle = (itemId: string) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onItemToggle({ ...checklist, items: updatedItems });
  };

  const handleValueChange = (itemId: string, value: string) => {
    onItemValueChange(checklist.id, itemId, value);
  };

  const isComplete = checklist.items.every(item => item.completed);

  return (
    <Card>
        <CardContent className="space-y-4 pt-6">
            {checklist.items.map(item => (
            <div key={item.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                <Checkbox
                    id={`${checklist.id}-${item.id}`}
                    checked={item.completed}
                    onCheckedChange={() => handleToggle(item.id)}
                />
                <Label htmlFor={`${checklist.id}-${item.id}`} className="flex-1">
                    {item.text}
                </Label>
                </div>
            </div>
            ))}
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => onReset(checklist.id)}>
            Reset
            </Button>
            <Button onClick={() => onUpdate(checklist)} disabled={!isComplete}>
            Submit Checklist
            </Button>
        </CardFooter>
    </Card>
  );
}
