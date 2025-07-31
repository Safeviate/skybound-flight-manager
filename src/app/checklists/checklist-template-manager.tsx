
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, ListChecks } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Checklist } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChecklistTemplateForm } from './checklist-template-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function ChecklistTemplateManager({ onUpdate }: { onUpdate: () => void }) {
    const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Checklist | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();

    const fetchTemplates = async () => {
        if (!company) return;
        const templatesQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
        const templatesSnapshot = await getDocs(templatesQuery);
        setChecklistTemplates(templatesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
    };

    useEffect(() => {
        if (company) {
            fetchTemplates();
        }
    }, [company]);
    
    const handleFormSubmit = async (data: Omit<Checklist, 'id' | 'companyId'>) => {
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
        onUpdate();
        closeDialog();
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
        onUpdate();
        toast({ title: "Template Deleted" });
    };

    const openNewDialog = () => {
        setEditingTemplate(null);
        setIsDialogOpen(true);
    }
    
    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingTemplate(null);
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-end mb-4">
                <Button onClick={openNewDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Template
                </Button>
            </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-1">
                {checklistTemplates.length > 0 ? (
                    checklistTemplates.map((template) => (
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
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete the "{template.title}" template. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <p className="text-muted-foreground col-span-full text-center py-10">No checklist templates found.</p>
                )}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Checklist Template' : 'Create New Checklist Template'}</DialogTitle>
                    </DialogHeader>
                    <ChecklistTemplateForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate || undefined} />
                </DialogContent>
            </Dialog>
        </div>
    );
}
