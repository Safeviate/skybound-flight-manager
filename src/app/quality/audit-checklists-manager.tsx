
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Checklist } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChecklistTemplateForm } from '@/app/checklists/checklist-template-form';

export function AuditChecklistsManager() {
    const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Checklist | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();

    const fetchTemplates = async () => {
        if (!company) return;
        // In a real app, these would be specific to audits, but we reuse for now.
        const templatesQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
        const snapshot = await getDocs(templatesQuery);
        setChecklistTemplates(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
    };

    useEffect(() => {
        if (company) {
            fetchTemplates();
        }
    }, [company]);

    const handleFormSubmit = async (data: Omit<Checklist, 'id' | 'companyId' | 'aircraftId'>) => {
        if (!company) return;

        if (editingTemplate) {
            const templateRef = doc(db, `companies/${company.id}/checklist-templates`, editingTemplate.id);
            await updateDoc(templateRef, data as any);
            toast({ title: "Template Updated" });
        } else {
            const newTemplate = { ...data, companyId: company.id };
            await addDoc(collection(db, `companies/${company.id}/checklist-templates`), newTemplate);
            toast({ title: "Template Created" });
        }
        fetchTemplates();
        setIsDialogOpen(false);
        setEditingTemplate(null);
    };

    const handleEdit = (template: Checklist) => {
        setEditingTemplate(template);
        setIsDialogOpen(true);
    };

    const handleDelete = async (templateId: string) => {
        if (!company) return;
        const templateRef = doc(db, `companies/${company.id}/checklist-templates`, templateId);
        await deleteDoc(templateRef);
        fetchTemplates();
        toast({ title: "Template Deleted" });
    };

    const openNewDialog = () => {
        setEditingTemplate(null);
        setIsDialogOpen(true);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Checklist Templates</CardTitle>
                <CardDescription>
                    Manage the master checklists used for conducting quality audits.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-end mb-4">
                    <Button onClick={openNewDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Checklist Template
                    </Button>
                </div>
                {checklistTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {checklistTemplates.map((template) => (
                            <Card key={template.id} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{template.title}</CardTitle>
                                    <CardDescription>{template.category}</CardDescription>
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
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No checklist templates found.</p>
                    </div>
                )}
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Checklist Template' : 'Create New Checklist Template'}</DialogTitle>
                    </DialogHeader>
                    <ChecklistTemplateForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate || undefined} />
                </DialogContent>
            </Dialog>
        </Card>
    );
}
