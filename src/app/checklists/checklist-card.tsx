
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Edit } from 'lucide-react';
import type { AuditChecklist, CompletedChecklist } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { PostMaintenanceChecklistForm } from './post-maintenance-checklist-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { AircraftInfoScanner } from '../aircraft/aircraft-info-scanner';

interface ChecklistCardProps {
  template: AuditChecklist;
  onEdit: (template: AuditChecklist) => void;
}

export function ChecklistCard({ template, onEdit }: ChecklistCardProps) {
  const [isPerformDialogOpen, setIsPerformDialogOpen] = useState(false);
  const { user, company } = useUser();
  const { toast } = useToast();

  const handleStandardFormSubmit = async (data: Record<string, any>) => {
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
      items: Object.entries(data).map(([key, value]) => {
        const originalItem = template.items.find(i => i.id === key);
        return {
          itemId: key,
          itemText: originalItem?.text || 'Unknown Item',
          completed: !!value, // Simple truthy check for completion
          value: value,
        };
      }),
    };

    try {
      await addDoc(collection(db, `companies/${company.id}/completed-checklists`), completedChecklist);
      toast({ title: 'Checklist Submitted', description: 'Your completed checklist has been saved.' });
      setIsPerformDialogOpen(false);
    } catch (error) {
      console.error("Error submitting checklist:", error);
      toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the checklist.' });
    }
  };
  
    const renderChecklistForm = () => {
        switch (template.id) {
            case 'master-post-maintenance':
                return <PostMaintenanceChecklistForm onSubmit={handleStandardFormSubmit} />;
            case 'master-pre-flight':
                // In a real app, you'd have a specific pre-flight form.
                // For now, we'll reuse the post-maintenance as a placeholder.
                return <PostMaintenanceChecklistForm onSubmit={handleStandardFormSubmit} />;
            case 'master-post-flight':
                 // For now, we'll reuse the post-maintenance as a placeholder.
                return <PostMaintenanceChecklistForm onSubmit={handleStandardFormSubmit} />;
            default:
                // Generic fallback
                return <p>This checklist cannot be performed at this time.</p>;
        }
    }


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

      <Dialog open={isPerformDialogOpen} onOpenChange={setIsPerformDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{template.title}</DialogTitle>
                <DialogDescription>Complete each item below.</DialogDescription>
            </DialogHeader>
            {renderChecklistForm()}
        </DialogContent>
      </Dialog>
    </>
  );
}
