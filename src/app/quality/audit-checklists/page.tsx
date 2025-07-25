
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Bot, Trash2 } from 'lucide-react';
import type { AuditChecklist, QualityAudit } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewChecklistForm } from './new-checklist-form';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import Link from 'next/link';
import { AiChecklistGenerator } from './ai-checklist-generator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';


interface AuditChecklistsPageProps {
  onAuditSubmit: (newAudit: QualityAudit) => void;
}

export default function AuditChecklistsPage({ onAuditSubmit }: AuditChecklistsPageProps) {
  const [checklists, setChecklists] = useState<AuditChecklist[]>([]);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedChecklists, setSelectedChecklists] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, company } = useUser();
  const canDelete = user?.permissions.includes('Quality:Delete');


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
      })),
    };
    try {
        const docRef = await addDoc(collection(db, `companies/${company.id}/audit-checklists`), newChecklist);
        setChecklists(prev => [...prev, { ...newChecklist, id: docRef.id }]);
        setIsManualDialogOpen(false);
        setIsAiDialogOpen(false);
        toast({
          title: 'Audit Checklist Created',
          description: `The "${newChecklist.title}" checklist has been added.`,
        });
    } catch (error) {
        console.error("Error creating new checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save checklist.'});
    }
  };

  const handleDeleteChecklists = async () => {
    if (!company || selectedChecklists.length === 0) return;
    try {
        const batch = writeBatch(db);
        selectedChecklists.forEach(id => {
            const docRef = doc(db, `companies/${company.id}/audit-checklists`, id);
            batch.delete(docRef);
        });
        await batch.commit();

        setChecklists(prev => prev.filter(c => !selectedChecklists.includes(c.id)));
        setSelectedChecklists([]);
        toast({
            title: 'Checklists Deleted',
            description: `${selectedChecklists.length} checklist(s) have been permanently removed.`
        });
    } catch (error) {
        console.error("Error deleting checklists:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete selected checklists.' });
    }
  };

  const handleSelectChecklist = (id: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedChecklists(prev => [...prev, id]);
    } else {
      setSelectedChecklists(prev => prev.filter(selectedId => selectedId !== id));
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
        <div className="flex items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedChecklists.length === 0 || !canDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedChecklists.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {selectedChecklists.length} selected checklist template(s).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChecklists}>
                            Yes, delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Bot className="mr-2 h-4 w-4" />
                  AI Checklist Generator
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>AI Audit Checklist Generator</DialogTitle>
                  <DialogDescription>
                    Provide a topic and let AI generate a starting checklist for you.
                  </DialogDescription>
                </DialogHeader>
                <AiChecklistGenerator onSave={(data) => handleNewChecklist({ ...data, area: 'Management' })} />
              </DialogContent>
            </Dialog>
            <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
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
        </div>
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
                    <Card key={checklist.id} className="flex flex-col relative">
                        {canDelete && (
                            <Checkbox
                                checked={selectedChecklists.includes(checklist.id)}
                                onCheckedChange={(checked) => handleSelectChecklist(checklist.id, !!checked)}
                                className="absolute top-4 left-4 h-5 w-5"
                                aria-label={`Select checklist ${checklist.title}`}
                            />
                        )}
                        <CardHeader className={canDelete ? "pl-12" : ""}>
                            <Link href={`/quality/audit-checklists/${checklist.id}`}>
                                <CardTitle className="text-base cursor-pointer hover:underline">{checklist.title}</CardTitle>
                            </Link>
                            <CardDescription>{checklist.items.length} items</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            
                        </CardFooter>
                    </Card>
                ))}
                </div>
            </TabsContent>
          ))}
        </Tabs>
         {checklists.length === 0 && (
          <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">No audit checklists found. Create one to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
