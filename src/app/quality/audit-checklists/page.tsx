
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { auditChecklistData } from '@/lib/mock-data';
import type { AuditChecklist, QualityAudit, NonConformanceIssue } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface AuditChecklistsPageProps {
  onAuditSubmit: (newAudit: QualityAudit) => void;
}

export default function AuditChecklistsPage({ onAuditSubmit }: AuditChecklistsPageProps) {
  const [checklists, setChecklists] = useState<AuditChecklist[]>(auditChecklistData);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleUpdate = (updatedChecklist: AuditChecklist) => {
    setChecklists(prev => prev.map(c => c.id === updatedChecklist.id ? updatedChecklist : c));
  };
  
  const handleReset = (checklistId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          const originalTemplate = auditChecklistData.find(t => t.id === checklistId);
          return {
            ...(originalTemplate || c),
            items: (originalTemplate || c).items.map(item => ({ ...item, isCompliant: null, notes: '' })),
          };
        }
        return c;
      })
    );
  };

  const handleNewChecklist = (newChecklistData: Omit<AuditChecklist, 'id' | 'items'> & { items: { text: string }[] }) => {
    const newChecklist: AuditChecklist = {
      ...newChecklistData,
      id: `acl-${Date.now()}`,
      items: newChecklistData.items.map((item, index) => ({ 
          ...item, 
          id: `item-${Date.now()}-${index}`,
          isCompliant: null,
          notes: '',
      })),
    };
    setChecklists(prev => [...prev, newChecklist]);
    setIsDialogOpen(false);
    toast({
      title: 'Audit Checklist Created',
      description: `The "${newChecklist.title}" checklist has been added.`,
    });
  };

  const handleChecklistEdit = (editedChecklist: AuditChecklist) => {
    setChecklists(prevChecklists => 
        prevChecklists.map(c => c.id === editedChecklist.id ? editedChecklist : c)
    );
  };

  const handleSubmit = (completedChecklist: AuditChecklist) => {
    const compliantItems = completedChecklist.items.filter(item => item.isCompliant === true).length;
    const totalItems = completedChecklist.items.length;
    const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100;

    const nonConformanceIssues: NonConformanceIssue[] = completedChecklist.items
      .filter(item => item.isCompliant === false)
      .map(item => ({
        id: `nci-${item.id}`,
        // A real implementation might have a more detailed category system
        category: 'Procedural', 
        description: `${item.text} - Auditor Notes: ${item.notes || 'N/A'}`,
      }));

    let status: QualityAudit['status'] = 'Compliant';
    if (nonConformanceIssues.length > 0) {
        status = complianceScore < 80 ? 'Non-Compliant' : 'With Findings';
    }
    
    const newAudit: QualityAudit = {
        id: `QA-${Date.now().toString().slice(-4)}`,
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'Internal',
        auditor: completedChecklist.auditor || 'Unknown',
        area: completedChecklist.department as any || 'General',
        status,
        complianceScore,
        nonConformanceIssues,
        summary: `Audit based on template "${completedChecklist.title}". Conducted by ${completedChecklist.auditor} on auditee ${completedChecklist.auditeeName} (${completedChecklist.auditeePosition}).`,
    };

    onAuditSubmit(newAudit);
    toast({
      title: 'Audit Submitted',
      description: `A new quality audit record has been created with a score of ${complianceScore}%.`,
    });
    // Reset the checklist after submission
    handleReset(completedChecklist.id);
  };

  const checklistsByArea = checklists.reduce((acc, checklist) => {
    const area = checklist.area;
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(checklist);
    return acc;
  }, {} as Record<AuditChecklist['area'], AuditChecklist[]>);

  const areas = Object.keys(checklistsByArea) as AuditChecklist['area'][];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Manage Audit Checklist Templates</CardTitle>
            <CardDescription>
                Create and manage the master checklists used for quality audits.
            </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create New Audit Checklist</DialogTitle>
              <DialogDescription>
                Define the title, area, and items for the new audit checklist template.
              </DialogDescription>
            </DialogHeader>
            <NewChecklistForm onSubmit={handleNewChecklist} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={areas[0] || 'all'}>
          <TabsList className="mb-4">
            {areas.map(area => (
                <TabsTrigger key={area} value={area}>{area}</TabsTrigger>
            ))}
          </TabsList>
          {areas.map(area => (
            <TabsContent key={area} value={area}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {checklistsByArea[area].map(checklist => (
                    <ChecklistCard 
                        key={checklist.id} 
                        checklist={checklist} 
                        onUpdate={handleUpdate}
                        onReset={handleReset}
                        onEdit={handleChecklistEdit}
                        onSubmit={handleSubmit}
                    />
                ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
