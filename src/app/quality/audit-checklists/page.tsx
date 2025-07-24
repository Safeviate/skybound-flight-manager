
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { AuditChecklist, QualityAudit } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc } from 'firebase/firestore';
import Link from 'next/link';

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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {checklistsByArea[area].map(checklist => (
                    <Link key={checklist.id} href={`/quality/audit-checklists/${checklist.id}`}>
                        <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
                            <CardHeader>
                                <CardTitle className="text-base">{checklist.title}</CardTitle>
                                <CardDescription>{checklist.items.length} items</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
