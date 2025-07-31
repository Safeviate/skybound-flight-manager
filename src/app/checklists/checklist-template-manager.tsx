
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, deleteDoc } from 'firebase/firestore';
import type { Checklist } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

export function ChecklistTemplateManager() {
    const [templates, setTemplates] = useState<Checklist[]>([]);
    const { company } = useUser();
    const { toast } = useToast();

    const fetchTemplates = async () => {
        if (!company) return;
        const q = query(collection(db, `companies/${company.id}/checklists`));
        const snapshot = await getDocs(q);
        setTemplates(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
    };

    useEffect(() => {
        if (company) {
            fetchTemplates();
        }
    }, [company]);
    
    const handleDelete = async (id: string) => {
        if(!company) return;
        await deleteDoc(doc(db, `companies/${company.id}/checklists`, id));
        fetchTemplates();
        toast({ title: "Template Deleted", description: "The checklist template has been removed." });
    }

    if (templates.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No checklist templates created yet.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
                <Card key={template.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle>{template.title}</CardTitle>
                        <CardDescription>{template.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <ul className="text-sm text-muted-foreground list-disc list-inside">
                            {template.items.slice(0, 4).map(item => (
                                <li key={item.id} className="truncate">{item.text}</li>
                            ))}
                            {template.items.length > 4 && <li>...and {template.items.length - 4} more</li>}
                        </ul>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(template.id)}><Trash2 className="h-4 w-4" /></Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
