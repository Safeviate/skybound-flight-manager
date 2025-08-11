

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Bot, FileText, Loader2, PlayCircle, Calendar as CalendarIcon, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, where, orderBy, limit } from 'firebase/firestore';
import type { AuditChecklist as Checklist, QualityAudit, User, AuditArea } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AuditChecklistTemplateForm } from './audit-checklist-template-form';
import { generateAuditChecklist } from '@/ai/flows/generate-audit-checklist-flow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';


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
                description: 'Could not generate the checklist. This is likely due to an invalid or missing API key. Please check the server logs for more details.',
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

const auditAreas: AuditArea[] = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

const StartAuditDialog = ({ onStart, personnel, template }: { onStart: (data: Omit<QualityAudit, 'id' | 'companyId' | 'title' | 'status' | 'complianceScore' | 'checklistItems' | 'nonConformanceIssues' | 'summary'>) => void, personnel: User[], template: Checklist }) => {
    const [leadAuditor, setLeadAuditor] = useState('');
    const [auditeeName, setAuditeeName] = useState('');
    const [auditTeam, setAuditTeam] = useState('');
    const [auditeeTeam, setAuditeeTeam] = useState('');
    const [auditType, setAuditType] = useState<'Internal' | 'External' | 'Self Audit'>('Internal');
    const [auditDate, setAuditDate] = useState<Date | undefined>(new Date());
    const [scope, setScope] = useState('');
    const [evidenceReference, setEvidenceReference] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [area, setArea] = useState<AuditArea>('Management');
    const { user } = useUser();
    
    const handleConfirm = () => {
        if (auditDate && user) {
            onStart({
                date: format(auditDate, 'yyyy-MM-dd'),
                type: auditType,
                auditor: leadAuditor,
                auditeeName: auditeeName,
                area: area,
                auditTeam: auditTeam.split(',').map(s => s.trim()).filter(Boolean),
                auditeeTeam: auditeeTeam.split(',').map(s => s.trim()).filter(Boolean),
                scope: scope,
                evidenceReference: evidenceReference,
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                    <PlayCircle className="mr-2 h-4 w-4" /> Start Audit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Start Audit: {template.title}</DialogTitle>
                    <DialogDescription>
                        Configure the details for this audit session.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Audit Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !auditDate && "text-muted-foreground")}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {auditDate ? format(auditDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={auditDate} onSelect={setAuditDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                         <div>
                            <Label>Type of Audit</Label>
                            <Select value={auditType} onValueChange={(v: 'Internal' | 'External' | 'Self Audit') => setAuditType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Internal">Internal</SelectItem>
                                    <SelectItem value="External">External</SelectItem>
                                    <SelectItem value="Self Audit">Self Audit</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div>
                        <Label>Audit Area</Label>
                         <Select value={area} onValueChange={(v: AuditArea) => setArea(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {auditAreas.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Lead Auditor</Label>
                         <Select value={leadAuditor} onValueChange={setLeadAuditor}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Lead Auditor" />
                            </SelectTrigger>
                            <SelectContent>
                                {personnel.map(p => (
                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Audit Team</Label>
                        <Input
                            placeholder="Enter team member names, comma separated"
                            value={auditTeam}
                            onChange={(e) => setAuditTeam(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Auditee</Label>
                        <Select value={auditeeName} onValueChange={setAuditeeName}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Primary Auditee" />
                            </SelectTrigger>
                            <SelectContent>
                                {personnel.map(p => (
                                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Auditee Team</Label>
                        <Input
                            placeholder="Enter team member names, comma separated"
                            value={auditeeTeam}
                            onChange={(e) => setAuditeeTeam(e.target.value)}
                        />
                    </div>
                     <div>
                        <Label>Audit Scope</Label>
                        <Textarea 
                            placeholder="e.g., Review maintenance records for ZS-ABC from Jan-Mar..." 
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>Evidence Reference</Label>
                        <Textarea 
                            placeholder="e.g., Maintenance Logbook Ref: 12345, Flight Folio 678" 
                            value={evidenceReference}
                            onChange={(e) => setEvidenceReference(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={handleConfirm} disabled={!auditDate || !leadAuditor || !auditeeName}>
                    Confirm and Start Audit
                </Button>
            </DialogContent>
        </Dialog>
    );
}

export function AuditChecklistsManager() {
    const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
    const [personnel, setPersonnel] = useState<User[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Checklist | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();
    const [creationMode, setCreationMode] = useState<'manual' | 'ai' | null>(null);
    const router = useRouter();

    const fetchTemplates = async () => {
        if (!company) return;
        const templatesQuery = query(collection(db, `companies/${company.id}/audit-checklists`));
        const personnelQuery = query(collection(db, `companies/${company.id}/users`), where('role', '!=', 'Student'));
        
        const [templatesSnapshot, personnelSnapshot] = await Promise.all([
            getDocs(templatesQuery),
            getDocs(personnelQuery),
        ]);

        setChecklistTemplates(templatesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
        setPersonnel(personnelSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    };

    useEffect(() => {
        if (company) {
            fetchTemplates();
        }
    }, [company]);

    const handleStartAudit = async (data: Omit<QualityAudit, 'id' | 'companyId' | 'title' | 'status' | 'complianceScore' | 'checklistItems' | 'nonConformanceIssues' | 'summary'>, template: Checklist) => {
        if (!company || !user) return;
        
        try {
            // Get the next audit number
            const auditsCollection = collection(db, `companies/${company.id}/quality-audits`);
            const currentYear = new Date().getFullYear();
            const yearPrefix = `AUD-${currentYear}-`;
            
            const q = query(auditsCollection, 
                where('auditNumber', '>=', yearPrefix),
                where('auditNumber', '<', `AUD-${currentYear+1}-`),
                orderBy('auditNumber', 'desc'),
                limit(1)
            );
            
            const querySnapshot = await getDocs(q);
            let nextNumber = 1;
            if (!querySnapshot.empty) {
                const lastAudit = querySnapshot.docs[0].data() as QualityAudit;
                const lastNumber = parseInt(lastAudit.auditNumber!.split('-')[2], 10);
                nextNumber = lastNumber + 1;
            }
            const newAuditNumber = `${yearPrefix}${String(nextNumber).padStart(3, '0')}`;

            const newAuditId = doc(collection(db, 'temp')).id;
            const newAudit: QualityAudit = {
                ...data,
                id: newAuditId,
                auditNumber: newAuditNumber,
                companyId: company.id,
                title: template.title || 'Untitled Audit',
                status: 'Open',
                complianceScore: 0,
                checklistItems: template.items || [],
                nonConformanceIssues: [],
                summary: '',
            };

            await setDoc(doc(db, `companies/${company.id}/quality-audits`, newAuditId), newAudit);
            router.push(`/quality/${newAuditId}`);
        } catch (error) {
            console.error("Error starting audit:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create new audit report.'});
        }
    }

    const handleFormSubmit = async (data: Omit<Checklist, 'id' | 'companyId' | 'area'>) => {
        if (!company) return;

        // Check if we are editing an existing template or creating a new one (including from AI)
        const isNew = !editingTemplate || editingTemplate.id.startsWith('temp-');
        
        const templateData = { ...data, companyId: company.id, area: 'Management' as AuditArea }; // Set default area

        if (isNew) {
            await addDoc(collection(db, `companies/${company.id}/audit-checklists`), templateData);
            toast({ title: "Template Created" });
        } else {
            const templateRef = doc(db, `companies/${company.id}/audit-checklists`, editingTemplate.id);
            await updateDoc(templateRef, templateData as any);
            toast({ title: "Template Updated" });
        }
        
        fetchTemplates();
        closeDialog();
    };

    const handleAiGenerated = (data: { title: string; items: { text: string; regulationReference: string }[] }) => {
        const newTemplate: Checklist = {
            id: `temp-${Date.now()}`,
            companyId: company?.id || '',
            title: data.title,
            area: 'Management',
            items: data.items.map((item, index) => ({
                id: `item-${Date.now()}-${index}`,
                text: item.text,
                regulationReference: item.regulationReference,
                finding: null,
                level: null,
            })),
            category: 'Pre-Flight',
        };
        setEditingTemplate(newTemplate);
        setCreationMode('manual');
        setIsDialogOpen(true);
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
                                    <StartAuditDialog 
                                        template={template} 
                                        onStart={(data) => handleStartAudit(data, template)} 
                                        personnel={personnel} 
                                    />
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
                <DialogContent className="sm:max-w-3xl">
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
                        <AuditChecklistTemplateForm onSubmit={handleFormSubmit} existingTemplate={editingTemplate} />
                    ) : creationMode === 'ai' ? (
                        <AiGenerator onGenerated={handleAiGenerated} />
                    ) : null}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
