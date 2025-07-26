
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { AuditChecklist, AuditChecklistItem, FindingType } from '@/lib/types';
import Header from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, FileText, MessageSquareWarning, XCircle, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const FINDING_OPTIONS: { value: FindingType; label: string, icon: React.ReactNode }[] = [
    { value: 'Compliant', label: 'Compliant', icon: <CheckCircle className="text-green-600" /> },
    { value: 'Non-compliant', label: 'Non-compliant', icon: <XCircle className="text-red-600" /> },
    { value: 'Partial', label: 'Partial Compliance', icon: <MinusCircle className="text-yellow-600" /> },
    { value: 'Observation', label: 'Observation', icon: <MessageSquareWarning className="text-blue-600" /> },
    { value: 'Not Applicable', label: 'N/A', icon: <FileText className="text-gray-500" /> },
];

export default function PerformAuditPage() {
    const params = useParams();
    const router = useRouter();
    const { user, company, loading: userLoading } = useUser();
    const { toast } = useToast();
    const checklistId = params.checklistId as string;

    const [checklist, setChecklist] = useState<AuditChecklist | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchChecklist = async () => {
            if (!company || !checklistId) return;
            setLoading(true);
            try {
                const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, checklistId);
                const docSnap = await getDoc(checklistRef);
                if (docSnap.exists()) {
                    setChecklist({ ...docSnap.data(), id: docSnap.id } as AuditChecklist);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Audit checklist not found.' });
                }
            } catch (error) {
                console.error("Error fetching checklist:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch checklist.' });
            } finally {
                setLoading(false);
            }
        };

        fetchChecklist();
    }, [checklistId, company, user, userLoading, router, toast]);

    const handleItemChange = (itemId: string, field: keyof AuditChecklistItem, value: any) => {
        setChecklist(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
            };
        });
    };

    const handleAuditeeChange = (field: 'auditeeName' | 'auditeePosition', value: string) => {
        setChecklist(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleSubmitAudit = async () => {
        if (!checklist || !company) return;
        
        // In a real app, you would generate a new audit record.
        // For this demo, we'll just update the template with the auditor's name.
        const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, checklist.id);
        try {
            await updateDoc(checklistRef, {
                ...checklist,
                auditor: user?.name,
            });
            toast({ title: 'Audit Submitted', description: 'The audit findings have been recorded.' });
            router.push('/quality?tab=audits');
        } catch (error) {
            console.error("Error submitting audit:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the audit findings.' });
        }
    };

    if (loading || userLoading) {
        return <div className="flex items-center justify-center h-screen"><p>Loading audit...</p></div>;
    }

    if (!checklist) {
        return <div className="flex items-center justify-center h-screen"><p>Audit checklist not found.</p></div>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Header title={`Performing Audit: ${checklist.title}`}>
                <Button asChild variant="outline">
                    <Link href="/quality?tab=audits">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Audits
                    </Link>
                </Button>
            </Header>
            <main className="flex-1 p-4 md:p-8">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-2xl">{checklist.title}</CardTitle>
                        <CardDescription>
                            Area: {checklist.area} | Auditor: {user?.name || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Auditee Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="auditeeName">Auditee Name</Label>
                                    <Input id="auditeeName" placeholder="e.g., John Smith" value={checklist.auditeeName || ''} onChange={(e) => handleAuditeeChange('auditeeName', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="auditeePosition">Auditee Position</Label>
                                    <Input id="auditeePosition" placeholder="e.g., Maintenance Manager" value={checklist.auditeePosition || ''} onChange={(e) => handleAuditeeChange('auditeePosition', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {checklist.items.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-lg space-y-4 bg-muted/20">
                                    <p className="font-semibold">
                                        {index + 1}. {item.text}
                                    </p>
                                    
                                    <div className="space-y-2">
                                        <Label>Finding</Label>
                                        <RadioGroup 
                                            value={item.finding || ''} 
                                            onValueChange={(value) => handleItemChange(item.id, 'finding', value)}
                                            className="flex flex-wrap gap-4"
                                        >
                                            {FINDING_OPTIONS.map(opt => (
                                                <div key={opt.value} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={opt.value || ''} id={`${item.id}-${opt.value}`} />
                                                    <Label htmlFor={`${item.id}-${opt.value}`} className="flex items-center gap-2 cursor-pointer">{opt.icon} {opt.label}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor={`observation-${item.id}`}>Observation / Notes</Label>
                                        <Textarea id={`observation-${item.id}`} placeholder="Describe any observations, non-conformities, or comments..." value={item.observation || ''} onChange={(e) => handleItemChange(item.id, 'observation', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`evidence-${item.id}`}>Evidence Reviewed</Label>
                                        <Input id={`evidence-${item.id}`} placeholder="e.g., Logbook entry #123, Maintenance record DT12345" value={item.evidence || ''} onChange={(e) => handleItemChange(item.id, 'evidence', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleSubmitAudit}>Submit Audit</Button>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}

