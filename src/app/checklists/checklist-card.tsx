
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Edit } from 'lucide-react';
import type { AuditChecklist } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { PerformChecklistDialog } from './perform-checklist-dialog';

interface ChecklistCardProps {
  template: AuditChecklist;
  onEdit: (template: AuditChecklist) => void;
}

export function ChecklistCard({ template, onEdit }: ChecklistCardProps) {
  const [isPerformDialogOpen, setIsPerformDialogOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>{template.title}</CardTitle>
          <CardDescription>Category: {template.category}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {template.items.slice(0, 5).map(item => (
              <li key={item.id} className="truncate">{item.text}</li>
            ))}
            {template.items.length > 5 && <li>...and {template.items.length - 5} more</li>}
          </ul>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button size="sm" onClick={() => setIsPerformDialogOpen(true)}>
            <PlayCircle className="mr-2 h-4 w-4" /> Perform Checklist
          </Button>
        </CardFooter>
      </Card>
      <PerformChecklistDialog
        isOpen={isPerformDialogOpen}
        onOpenChange={setIsPerformDialogOpen}
        template={template}
      />
    </>
  );
}
