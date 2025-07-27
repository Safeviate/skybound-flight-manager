

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Bot, FileText, Loader2, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import type { AuditChecklist as Checklist, QualityAudit } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuditChecklistTemplateForm } from './audit-checklist-template-form';
import { generateAuditChecklist } from '@/ai/flows/generate-audit-checklist-flow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const AiGenerator = ({ onGenerated }: { onGenerated: (data: any) => void }) => {
    const [topic, setTopic] = useState('');
    const [numItems, setNumItems] = useState('10');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await generateAuditChecklist({
                topic,
                numItems: parseInt(numItems, 10),
            });
            onGenerated(result);
        } catch (error) {
            console.error('AI Generation Error:', error);
            toast({
                variant: 'destructive',
                title: 'AI Generation Failed',
                description: 'Could not generate the checklist. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="topic">Audit Topic</Label>
                <Input 
                    id="topic" 
                    name="topic" 
                    placeholder="e.g., Hangar Safety, Flight Documentation" 
                    required 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="numItems">Number of Items</Label>
                <Input 
                    id="numItems" 
                    name="numItems" 
                    type="number" 
                    value={numItems}
                    onChange={(e) => setNumItems(e.target.value)}
                    required 
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Generate Checklist
            </Button>
        </form>
    )
}

export function AuditChecklistsManager() {
    const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Checklist | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();
    const [creationMode, setCreationMode] = useState<'manual' | 'ai' | null>(null);
    const router = useRouter();

    const fetchTemplates = async () => {
        if (!company) return;
        const templatesQuery = query(collection(db, `companies/${company.id}/audit-checklists`));
        const snapshot = await getDocs(templatesQuery);
        setChecklistTemplates(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
    };

    useEffect(() => {
        if (company) {
            fetchTemplates();
        }
    }, [company]);

    const handleStartAudit = async (template: Checklist) => {
        if (!company || !user) return;
        const newAuditId = doc(collection(db, 'temp')).id;
        const newAudit: QualityAudit = {
            id: newAuditId,
            companyId: company.id,
            title: template.title,
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'Internal',
            auditor: user.name,
            area: template.area,
            status: 'Open',
            complianceScore: 0,
            checklistItems: template.items,
            nonConformanceIssues: [],
            summary: '',
        };

        try {
            await setDoc(doc(db, `companies/${company.id}/quality-audits`, newAuditId), newAudit);
            router.push(`/quality/${newAuditId}`);
        } catch (error) {
            console.error("Error starting audit:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create new audit report.'});
        }
    }

    const handleFormSubmit = async (data: Omit<Checklist, 'id' | 'companyId'>) => {
        if (!company) return;

        if (editingTemplate) {
            const templateRef = doc(db, `companies/${company.id}/audit-checklists`, editingTemplate.id);
            await updateDoc(templateRef, data as any);
            toast({ title: "Template Updated" });
        } else {
            const newTemplate = { ...data, companyId: company.id };
            await addDoc(collection(db, `companies/${company.id}/audit-checklists`), newTemplate);
            toast({ title: "Template Created" });
        }
        fetchTemplates();
        closeDialog();
    };

    const handleAiGenerated = (data: { title: string; items: { text: string; regulationReference: string }[] }) => {
        const newTemplate: Omit<Checklist, 'id' | 'companyId'> = {
            title: data.title,
            area: 'Management', // Default area, can be changed
            items: data.items.map((item, index) => ({
                id: `item-${Date.now()}-${index}`,
                text: item.text,
                regulationReference: item.regulationReference,
                finding: null,
                level: null,
            })),
        };
        handleFormSubmit(newTemplate);
    };

    const handleEdit = (template: Checklist) => {
        setEditingTemplate(template);
        setCreationMode('manual');
        setIsDialogOpen(true);
    };

    const handleDelete = async (templateId: string) => {
        if (!company) return;
        const templateRef = doc(db, `companies/${company.id}/audit-checklists`, templateId);
        await deleteDoc(templateRef);
        fetchTemplates();
        toast({ title: "Template Deleted" });
    };

    const openNewDialog = () => {
        setEditingTemplate(null);
        setCreationMode(null);
        setIsDialogOpen(true);
    }
    
    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingTemplate(null);
        setCreationMode(null);
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
                                    <CardDescription>{template.area}</CardDescription>
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
                                    <Button variant="secondary" size="sm" onClick={() => handleStartAudit(template)}>
                                        <PlayCircle className="mr-2 h-4 w-4" /> Start Audit
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDelete(template.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No audit checklist templates found.</p>
                    </div>
                )}
            </CardContent>
             <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? 'Edit Checklist Template' : 'Create New Checklist Template'}</DialogTitle>
                    </DialogHeader>
                    {!creationMode && !editingTemplate ? (
                         <div className="flex gap-4 pt-4">
                            <Button variant="outline" className="w-full h-24 flex-col" onClick={() => setCreationMode('manual')}>
                                <FileText className="h-8 w-8 mb-2" />
                                Manual Creation
                            </Button>
                            <Button variant="outline" className="w-full h-24 flex-col" onClick={() => setCreationMode('ai')}>
                                <Bot className="h-8 w-8 mb-2" />
                                AI Generator
                            </Button>
                        </div>
                    ) : creationMode === 'manual' ? (
                        <AuditChecklistTemplateForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate || undefined} />
                    ) : creationMode === 'ai' ? (
                        <AiGenerator onGenerated={handleAiGenerated} />
                    ) : null}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

