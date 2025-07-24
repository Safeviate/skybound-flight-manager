
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ChecklistTemplateForm } from './checklist-template-form';
import type { Checklist, Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, writeBatch, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function AssignChecklistDialog({ onAssign, templates, aircraftList }: { onAssign: (aircraftId: string, templateId: string) => void, templates: Checklist[], aircraftList: Aircraft[] }) {
    const [aircraftId, setAircraftId] = useState('');
    const [templateId, setTemplateId] = useState('');
  
    const handleAssign = () => {
      if (aircraftId && templateId) {
        onAssign(aircraftId, templateId);
      }
    };
  
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Checklist to Aircraft</DialogTitle>
          <DialogDescription>
            Select an aircraft and a master checklist template to create a new, specific checklist for that aircraft.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="aircraft-select">Aircraft</label>
            <Select onValueChange={setAircraftId}>
              <SelectTrigger id="aircraft-select">
                <SelectValue placeholder="Select an aircraft" />
              </SelectTrigger>
              <SelectContent>
                {aircraftList.map(ac => (
                  <SelectItem key={ac.id} value={ac.id}>{ac.model} ({ac.tailNumber})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="template-select">Checklist Template</label>
            <Select onValueChange={setTemplateId}>
              <SelectTrigger id="template-select">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title} ({t.category})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleAssign} disabled={!aircraftId || !templateId}>Assign Checklist</Button>
      </DialogContent>
    );
}

export function ChecklistsManager({ aircraftList, refetchData }: { aircraftList: Aircraft[], refetchData?: () => void }) {
  const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
  const { user, company } = useUser();
  const { toast } = useToast();
  const [isNewChecklistDialogOpen, setIsNewChecklistDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Checklist | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const fetchTemplates = async () => {
    if (!company) return;
    try {
        const templatesQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates = templatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
        setChecklistTemplates(templates);
    } catch (error) {
        console.error("Error fetching templates:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load checklist templates.' });
    }
  };

  useEffect(() => {
    if (company) {
        fetchTemplates();
    }
  }, [company, toast]);

  const handleRefetch = () => {
    fetchTemplates();
    refetchData?.();
  };

  const handleNewChecklist = async (newChecklistData: Omit<Checklist, 'id' | 'companyId' | 'aircraftId'>) => {
    if (!company) return;
    const checklistToSave: Omit<Checklist, 'id'> = {
        ...newChecklistData,
        companyId: company.id,
    };
    try {
        const docRef = await addDoc(collection(db, `companies/${company.id}/checklist-templates`), checklistToSave);
        setChecklistTemplates(prev => [...prev, { ...checklistToSave, id: docRef.id }]);
        setIsNewChecklistDialogOpen(false);
        toast({ title: 'Checklist Template Created', description: `"${newChecklistData.title}" has been saved.`});
    } catch(error) {
        console.error("Error creating new checklist template:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to create checklist template.'});
    }
  };
  
  const handleUpdateChecklist = async (updatedChecklistData: Checklist) => {
    if (!company) return;
    try {
        const templateRef = doc(db, `companies/${company.id}/checklist-templates`, updatedChecklistData.id);
        
        const batch = writeBatch(db);
        
        batch.update(templateRef, updatedChecklistData as any);
        
        const assignedChecklistsQuery = query(collection(db, `companies/${company.id}/checklists`), where('templateId', '==', updatedChecklistData.id));
        const snapshot = await getDocs(assignedChecklistsQuery);
        
        snapshot.docs.forEach(doc => {
            const { id, aircraftId, templateId, companyId, ...restOfTemplate } = updatedChecklistData;
            batch.update(doc.ref, { ...restOfTemplate });
        });
        
        await batch.commit();
        
        setChecklistTemplates(prev => prev.map(t => t.id === updatedChecklistData.id ? updatedChecklistData : t));
        handleRefetch();
        setEditingTemplate(null);

        toast({ title: 'Template Updated', description: `"${updatedChecklistData.title}" and all its assignments have been updated.`});
    } catch(error) {
        console.error("Error updating template:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update template and its assignments.'});
    }
  };

  const handleAssignChecklist = async (aircraftId: string, templateId: string) => {
    if (!company) return;
    const template = checklistTemplates.find(t => t.id === templateId);
    if (!template) {
        toast({ variant: 'destructive', title: 'Error', description: 'Template not found.' });
        return;
    }

    const newChecklistForAircraft: Omit<Checklist, 'id'> = {
        ...template,
        aircraftId,
        templateId: template.id,
    };

    try {
        await addDoc(collection(db, `companies/${company.id}/checklists`), newChecklistForAircraft);
        handleRefetch();
        toast({ title: 'Checklist Assigned', description: `"${template.title}" has been assigned to the selected aircraft.` });
        setIsAssignDialogOpen(false);
    } catch (error) {
        console.error("Error assigning checklist:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign checklist.' });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!company) return;
    try {
        const batch = writeBatch(db);
        
        const templateRef = doc(db, `companies/${company.id}/checklist-templates`, templateId);
        batch.delete(templateRef);

        const assignedChecklistsQuery = query(collection(db, `companies/${company.id}/checklists`), where('templateId', '==', templateId));
        const snapshot = await getDocs(assignedChecklistsQuery);
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();

        setChecklistTemplates(prev => prev.filter(t => t.id !== templateId));
        handleRefetch();
        toast({ title: 'Template Deleted', description: 'The checklist template and all its assignments have been removed.' });
    } catch (error) {
        console.error("Error deleting template:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete template and its assignments.' });
    }
  };
  
  const handleEditClick = (template: Checklist) => {
    setEditingTemplate(template);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Checklist Templates</DialogTitle>
        <DialogDescription>
            Manage master checklist templates and assign them to aircraft.
        </DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-end gap-2 py-4">
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Assign Checklist
                </Button>
            </DialogTrigger>
            <AssignChecklistDialog 
                onAssign={handleAssignChecklist}
                templates={checklistTemplates}
                aircraftList={aircraftList}
            />
        </Dialog>
        <Dialog open={isNewChecklistDialogOpen} onOpenChange={setIsNewChecklistDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Template
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Create New Checklist Template</DialogTitle>
                    <DialogDescription>
                        This will create a master template that can be assigned to multiple aircraft.
                    </DialogDescription>
                </DialogHeader>
                <ChecklistTemplateForm onSubmit={handleNewChecklist} />
            </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-6">
          {checklistTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {checklistTemplates.map(checklist => (
                    <Card key={checklist.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">{checklist.title}</CardTitle>
                            <CardDescription>{checklist.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {checklist.items.slice(0, 5).map(item => (
                                    <li key={item.id} className="truncate">{item.text}</li>
                                ))}
                                {checklist.items.length > 5 && (
                                    <li>...and {checklist.items.length - 5} more.</li>
                                )}
                            </ul>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(checklist)}>
                                <Edit className="h-4 w-4 mr-2"/>
                                Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(checklist.id)}>
                                <Trash2 className="h-4 w-4 mr-2 text-destructive"/>
                                Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No checklist templates found. Create one to get started.</p>
            </div>
          )}
      </div>

      {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
              <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                      <DialogTitle>Edit Checklist Template</DialogTitle>
                      <DialogDescription>
                          Modify the details for this master template. Changes will affect newly assigned checklists.
                      </DialogDescription>
                  </DialogHeader>
                  <ChecklistTemplateForm
                      onSubmit={(data) => handleUpdateChecklist({ ...data, id: editingTemplate.id, companyId: editingTemplate.companyId })}
                      existingTemplate={editingTemplate}
                  />
              </DialogContent>
          </Dialog>
      )}
    </>
  );
}

function ChecklistsPage() {
    const { user, company, loading } = useUser();
    const router = useRouter();
    const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);

    const fetchData = async () => {
        if (!company) return;
        try {
            const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
            const aircraftSnapshot = await getDocs(aircraftQuery);
            const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
            setAircraftList(aircraftList);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (company) {
            fetchData();
        }
    }, [user, company, loading, router]);

    if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }
    
    return (
        <main className="flex-1 p-4 md:p-8 space-y-8">
            <ChecklistsManager aircraftList={aircraftList} refetchData={fetchData} />
        </main>
    )
}

ChecklistsPage.title = 'Checklist Management';
export default ChecklistsPage;
