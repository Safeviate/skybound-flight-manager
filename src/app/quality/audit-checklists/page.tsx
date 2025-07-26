
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Database, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewChecklistForm } from './new-checklist-form';
import { AiChecklistGenerator } from './ai-checklist-generator';
import type { AuditChecklist, QualityAudit } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { auditChecklistData as seedChecklists, qualityAuditData as seedAudits } from '@/lib/data-provider';

interface ChecklistsManagerProps {
    refetchParent?: () => void;
}

export function ChecklistsManager({ refetchParent }: ChecklistsManagerProps) {
    const { company } = useUser();
    const { toast } = useToast();
    const [checklistTemplates, setChecklistTemplates] = useState<AuditChecklist[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<AuditChecklist | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);

    const fetchTemplates = async () => {
        if (!company) return;
        try {
            const q = query(collection(db, `companies/${company.id}/audit-checklists`));
            const snapshot = await getDocs(q);
            const templates = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditChecklist));
            setChecklistTemplates(templates);
        } catch (error) {
            console.error("Error fetching checklist templates:", error);
            toast({
                variant: 'destructive',
                title: 'Error fetching templates',
                description: 'Could not load checklist templates from the database.'
            });
        }
    };

    useEffect(() => {
        if(company) {
            fetchTemplates();
        }
    }, [company]);
    
    const handleFormSubmit = async (data: Omit<AuditChecklist, 'id' | 'companyId'>) => {
        if (!company) return;

        const templateToSave: Omit<AuditChecklist, 'id'> = {
            ...data,
            companyId: company.id,
        };

        try {
            if (editingTemplate) {
                const templateRef = doc(db, `companies/${company.id}/audit-checklists`, editingTemplate.id);
                await setDoc(templateRef, templateToSave);
                toast({ title: 'Template Updated', description: `"${data.title}" has been saved.` });
            } else {
                await addDoc(collection(db, `companies/${company.id}/audit-checklists`), templateToSave);
                toast({ title: 'Template Created', description: `"${data.title}" has been created.` });
            }
            fetchTemplates();
            refetchParent?.();
            setIsDialogOpen(false);
            setEditingTemplate(null);
        } catch (error) {
            console.error("Error saving template:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the template.' });
        }
    };

    const handleAiChecklistSave = async (data: Omit<AuditChecklist, 'id' | 'companyId'>) => {
        await handleFormSubmit(data);
    };
    
    const handleDelete = async (templateId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/audit-checklists`, templateId));
            toast({ title: 'Template Deleted', description: 'The checklist template has been removed.' });
            fetchTemplates();
            refetchParent?.();
        } catch (error) {
            console.error("Error deleting template:", error);
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the template.' });
        }
    };
    
    const openDialog = (template: AuditChecklist | null = null) => {
        setEditingTemplate(template);
        setIsDialogOpen(true);
    };

    const handleSeedData = async () => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'No company context found.' });
            return;
        }
        setIsSeeding(true);
        try {
            const batch = writeBatch(db);

            // Seed checklists
            seedChecklists.forEach(checklist => {
                const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, checklist.id);
                batch.set(checklistRef, { ...checklist, companyId: company.id });
            });

            // Seed a completed audit report
            seedAudits.forEach(audit => {
                const auditRef = doc(db, `companies/${company.id}/quality-audits`, audit.id);
                batch.set(auditRef, { ...audit, companyId: company.id });
            });

            await batch.commit();

            toast({
                title: 'Sample Data Seeded',
                description: 'Sample checklists and an audit report have been added.'
            });

            fetchTemplates();
            refetchParent?.();
        } catch (error) {
            console.error("Error seeding data:", error);
            toast({ variant: 'destructive', title: 'Seeding Failed', description: 'Could not add sample data.' });
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <>
             <CardHeader className="flex flex-row items-center justify-between px-0 pt-0">
                <div>
                    <CardTitle>Audit Checklist Templates</CardTitle>
                    <CardDescription>
                        Manage the master checklists used for quality audits.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleSeedData} variant="outline" disabled={isSeeding}>
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Seed Sample Data
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => openDialog()}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                New Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                             <DialogHeader>
                                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                                <DialogDescription>
                                    {editingTemplate ? 'Modify the existing template.' : 'Create a new audit checklist template manually or with AI assistance.'}
                                </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="manual">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="manual">Create Manually</TabsTrigger>
                                    <TabsTrigger value="ai">Generate with AI</TabsTrigger>
                                </TabsList>
                                <TabsContent value="manual">
                                    <NewChecklistForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate || undefined} />
                                </TabsContent>
                                <TabsContent value="ai">
                                    <AiChecklistGenerator onSave={handleAiChecklistSave} />
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                {checklistTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {checklistTemplates.map((template) => (
                            <Card key={template.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-base">{template.title}</CardTitle>
                                    <CardDescription>{template.area} ({template.items.length} items)</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                                        {template.items.slice(0, 4).map(item => (
                                            <li key={item.id} className="truncate">{item.text}</li>
                                        ))}
                                        {template.items.length > 4 && <li>...and {template.items.length - 4} more.</li>}
                                    </ul>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openDialog(template)}>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
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
            </CardContent>
        </>
    );
}
