
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { AuditChecklist, AuditChecklistItem } from '@/lib/types';
import { RotateCcw, CheckCircle, XCircle, Edit, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils.tsx';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ChecklistCardProps {
  checklist: AuditChecklist;
  onUpdate: (checklist: AuditChecklist) => void;
  onReset: (checklistId: string) => void;
  onEdit: (checklist: AuditChecklist) => void;
}

export function ChecklistCard({ checklist, onUpdate, onReset, onEdit }: ChecklistCardProps) {
  const [department, setDepartment] = useState(checklist.department || '');
  const [auditeeName, setAuditeeName] = useState(checklist.auditeeName || '');
  const [auditeePosition, setAuditeePosition] = useState(checklist.auditeePosition || '');
  const [auditor, setAuditor] = useState(checklist.auditor || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editableChecklist, setEditableChecklist] = useState<AuditChecklist>(checklist);
  const { toast } = useToast();

  const handleItemToggle = (itemId: string, status: boolean) => {
    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, isCompliant: status } : item
    );
    onUpdate({ ...checklist, items: updatedItems });
  };
  
  const handleNotesChange = (itemId: string, notes: string) => {
      const updatedItems = checklist.items.map(item => 
        item.id === itemId ? { ...item, notes } : item
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
    const auditData = {
        ...checklist,
        department,
        auditeeName,
        auditeePosition,
        auditor,
        complianceRate: complianceRate.toFixed(0) + "%"
    };
    console.log("Submitting audit:", auditData);
     toast({
      title: 'Audit Submitted',
      description: `The "${checklist.title}" audit has been submitted.`,
    });
  }
  
  const handleEditToggle = () => {
    if (isEditing) {
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
      const newItem: AuditChecklistItem = {
          id: `item-${Date.now()}`,
          text: 'New item',
          isCompliant: null,
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
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <CardTitle>{checklist.title}</CardTitle>
             <Button variant="ghost" size="icon" onClick={handleEditToggle}>
                <Edit className="h-4 w-4" />
            </Button>
        </div>
        <CardDescription>
          {completedItems} of {totalItems} items completed.
        </CardDescription>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t mt-2">
            <div>
                <Label htmlFor={`department-${checklist.id}`} className="text-xs">Department</Label>
                <Input id={`department-${checklist.id}`} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Maintenance" />
            </div>
            <div>
                <Label htmlFor={`auditor-${checklist.id}`} className="text-xs">Auditor</Label>
                <Input id={`auditor-${checklist.id}`} value={auditor} onChange={(e) => setAuditor(e.target.value)} placeholder="Auditor Name" />
            </div>
            <div>
                <Label htmlFor={`auditeeName-${checklist.id}`} className="text-xs">Auditee Name</Label>
                <Input id={`auditeeName-${checklist.id}`} value={auditeeName} onChange={(e) => setAuditeeName(e.target.value)} placeholder="Person being audited" />
            </div>
             <div>
                <Label htmlFor={`auditeePosition-${checklist.id}`} className="text-xs">Position</Label>
                <Input id={`auditeePosition-${checklist.id}`} value={auditeePosition} onChange={(e) => setAuditeePosition(e.target.value)} placeholder="Auditee's role" />
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Progress value={progress} />
        <div className="space-y-4 overflow-y-auto pr-2 md:max-h-80">
          {checklist.items.map(item => (
            <div key={item.id} className="space-y-3 p-3 border rounded-lg bg-muted/30">
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
              <Textarea
                placeholder="Add notes or evidence..."
                value={item.notes || ''}
                onChange={(e) => handleNotesChange(item.id, e.target.value)}
                className="bg-background"
              />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {isComplete && (
            <div className="text-center bg-muted p-3 rounded-md w-full">
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
