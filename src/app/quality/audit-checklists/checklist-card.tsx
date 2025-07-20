
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { AuditChecklist, AuditChecklistItem } from '@/lib/types';
import { RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils.tsx';

interface ChecklistCardProps {
  checklist: AuditChecklist;
  onUpdate: (checklist: AuditChecklist) => void;
  onReset: (checklistId: string) => void;
}

export function ChecklistCard({ checklist, onUpdate, onReset }: ChecklistCardProps) {

  const handleItemToggle = (itemId: string, status: boolean) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, isCompliant: status } : item
    );
    onUpdate({ ...checklist, items: updatedItems });
  };
  
  const completedItems = useMemo(() => checklist.items.filter(item => item.isCompliant !== null).length, [checklist.items]);
  const compliantItems = useMemo(() => checklist.items.filter(item => item.isCompliant === true).length, [checklist.items]);
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const complianceRate = totalItems > 0 ? (compliantItems / totalItems) * 100 : 0;
  
  const isComplete = progress === 100;
  
  const handleResetClick = () => {
      onReset(checklist.id);
  }

  const handleSubmit = () => {
    // In a real app, this would submit the audit result to the backend
    console.log("Submitting audit:", checklist.title, "Compliance:", complianceRate.toFixed(0) + "%");
  }


  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{checklist.title}</CardTitle>
        <CardDescription>
          {completedItems} of {totalItems} items completed.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Progress value={progress} />
        <div className="space-y-3 overflow-y-auto pr-2 md:max-h-60">
          {checklist.items.map(item => (
            <div key={item.id} className="space-y-2">
              <Label
                htmlFor={`${checklist.id}-${item.id}`}
                className={cn("flex-1 text-sm", item.isCompliant !== null && 'text-muted-foreground')}
              >
                {item.text}
              </Label>
               <div className="flex gap-2">
                <Button 
                    size="sm" 
                    variant={item.isCompliant === true ? 'success' : 'outline'} 
                    onClick={() => handleItemToggle(item.id, true)}
                    className="w-full"
                >
                    <CheckCircle className="mr-2 h-4 w-4" /> Compliant
                </Button>
                <Button 
                    size="sm" 
                    variant={item.isCompliant === false ? 'destructive' : 'outline'} 
                    onClick={() => handleItemToggle(item.id, false)}
                    className="w-full"
                >
                    <XCircle className="mr-2 h-4 w-4" /> Non-Compliant
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {isComplete && (
            <div className="text-center bg-muted p-3 rounded-md">
                <p className="font-semibold">Compliance Rate: {complianceRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                    This checklist is complete and ready for submission.
                </p>
            </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" size="sm" onClick={handleResetClick} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
            </Button>
            <Button size="sm" onClick={handleSubmit} className="w-full" disabled={!isComplete}>
                Submit Audit
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
