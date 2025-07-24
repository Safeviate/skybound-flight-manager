
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { AuditChecklist, QualityAudit, NonConformanceIssue, FindingType } from '@/lib/types';
import { ChecklistCard } from './checklist-card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, setDoc } from 'firebase/firestore';

interface AuditChecklistsPageProps {
  onAuditSubmit: (newAudit: QualityAudit) => void;
}

export default function AuditChecklistsPage({ onAuditSubmit }: AuditChecklistsPageProps) {
  const [checklists, setChecklists] = useState<AuditChecklist[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { company } = useUser();

  useEffect(() => {
    if (!company) return;
    const fetchChecklists = async () => {
      try {
        const checklistsRef = collection(db, `companies/${company.id}/audit-checklists`);
        const snapshot = await getDocs(checklistsRef);
        const checklistList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditChecklist));
        setChecklists(checklistList);
      } catch (error) {
        console.error("Error fetching audit checklists:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load checklists.' });
      }
    };
    fetchChecklists();
  }, [company, toast]);

  const handleUpdate = async (updatedChecklist: AuditChecklist) => {
    setChecklists(prev => prev.map(c => c.id === updatedChecklist.id ? updatedChecklist : c));
    if (!company) return;
    try {
        const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, updatedChecklist.id);
        await setDoc(checklistRef, updatedChecklist, { merge: true });
    } catch (error) {
        console.error("Error updating checklist state:", error);
    }
  };
  
  const handleReset = (checklistId: string) => {
    setChecklists(prevChecklists =>
      prevChecklists.map(c => {
        if (c.id === checklistId) {
          return {
            ...c,
            items: c.items.map(item => ({ ...item, finding: null, notes: '' })),
          };
        }
        return c;
      })
    );
  };

  const handleNewChecklist = async (newChecklistData: Omit<AuditChecklist, 'id' | 'items' | 'companyId'> & { items: { text: string }[] }) => {
    if (!company) return;
    const newChecklist: Omit<AuditChecklist, 'id'> = {
      ...newChecklistData,
      companyId: company.id,
      items: newChecklistData.items.map((item, index) => ({ 
          ...item, 
          id: `item-${Date.now()}-${index}`,
          finding: null,
          notes: '',
      })),
    };
    try {
        const docRef = await addDoc(collection(db, `companies/${company.id}/audit-checklists`), newChecklist);
        setChecklists(prev => [...prev, { ...newChecklist, id: docRef.id }]);
        setIsDialogOpen(false);
        toast({
          title: 'Audit Checklist Created',
          description: `The "${newChecklist.title}" checklist has been added.`,
        });
    } catch (error) {
        console.error("Error creating new checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save checklist.'});
    }
  };

  const handleChecklistEdit = async (editedChecklist: AuditChecklist) => {
    setChecklists(prevChecklists => 
        prevChecklists.map(c => c.id === editedChecklist.id ? editedChecklist : c)
    );
    if (!company) return;
    try {
        const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, editedChecklist.id);
        await setDoc(checklistRef, editedChecklist, { merge: true });
    } catch (error) {
        console.error("Error updating checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save checklist edits.'});
    }
  };

  const handleSubmit = (completedChecklist: AuditChecklist) => {
    if (!company) return;
    const compliantItems = completedChecklist.items.filter(item => item.finding === 'Compliant').length;
    const totalItems = completedChecklist.items.length;
    const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100;

    const nonConformanceIssues: NonConformanceIssue[] = completedChecklist.items
      .filter(item => item.finding && item.finding !== 'Compliant')
      .map(item => ({
        id: `nci-${item.id}`,
        level: item.finding as NonConformanceIssue['level'],
        category: 'Procedural', 
        description: `${item.text} - Auditor Notes: ${item.notes || 'N/A'}`,
      }));

    let status: QualityAudit['status'] = 'Compliant';
    if (nonConformanceIssues.length > 0) {
        status = complianceScore < 80 ? 'Non-Compliant' : 'With Findings';
    }
    
    const newAudit: QualityAudit = {
        id: `QA-${Date.now().toString().slice(-4)}`,
        companyId: company.id,
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
                <div className="grid gap-4 md:grid-cols-2">
                {checklistsByArea[area].map(checklist => (
                    <Dialog key={checklist.id}>
                        <DialogTrigger asChild>
                            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <CardHeader>
                                    <CardTitle className="text-base">{checklist.title}</CardTitle>
                                    <CardDescription>{checklist.items.length} items</CardDescription>
                                </CardHeader>
                            </Card>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>{checklist.title}</DialogTitle>
                                <DialogDescription>
                                Complete the audit checklist below. Your progress is saved automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="overflow-y-auto pr-2">
                                <ChecklistCard 
                                    checklist={checklist} 
                                    onUpdate={handleUpdate}
                                    onReset={handleReset}
                                    onEdit={handleChecklistEdit}
                                    onSubmit={handleSubmit}
                                />
                           </div>
                        </DialogContent>
                    </Dialog>
                ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
