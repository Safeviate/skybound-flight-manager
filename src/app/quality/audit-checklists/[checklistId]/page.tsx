
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { AuditChecklist, AuditChecklistItem, FindingStatus, FindingLevel, QualityAudit, NonConformanceIssue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, FileText, MessageSquareWarning, XCircle, MinusCircle, AlertTriangle, Bot } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { addDoc, collection } from 'firebase/firestore';
import { format } from 'date-fns';

const FINDING_OPTIONS: { value: FindingStatus; label: string, icon: React.ReactNode }[] = [
    { value: 'Compliant', label: 'Compliant', icon: <CheckCircle className="text-green-600" /> },
    { value: 'Non-compliant', label: 'Non-compliant', icon: <XCircle className="text-red-600" /> },
    { value: 'Partial', label: 'Partial Compliance', icon: <MinusCircle className="text-yellow-600" /> },
    { value: 'Not Applicable', label: 'N/A', icon: <FileText className="text-gray-500" /> },
];

const LEVEL_OPTIONS: { value: FindingLevel | 'Observation', label: string, icon: React.ReactNode }[] = [
    { value: 'Observation', label: 'Observation', icon: <MessageSquareWarning className="text-blue-600" /> },
    { value: 'Level 1 Finding', label: 'Level 1 Finding', icon: <AlertTriangle className="text-yellow-600" /> },
    { value: 'Level 2 Finding', label: 'Level 2 Finding', icon: <AlertTriangle className="text-orange-500" /> },
    { value: 'Level 3 Finding', label: 'Level 3 Finding', icon: <AlertTriangle className="text-red-600" /> },
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
                items: prev.items.map(item => {
                    if (item.id === itemId) {
                        const updatedItem: AuditChecklistItem = { ...item, [field]: value };
                        // If finding is compliant or N/A, clear the level.
                        if (field === 'finding' && (value === 'Compliant' || value === 'Not Applicable')) {
                            updatedItem.level = null;
                        }
                         if (field === 'level' && value === 'Observation') {
                            updatedItem.finding = 'Observation';
                            updatedItem.level = null;
                        } else if (field === 'level' && value !== 'Observation' && updatedItem.finding !== 'Non-compliant' && updatedItem.finding !== 'Partial') {
                             updatedItem.finding = 'Non-compliant';
                         }
                        return updatedItem;
                    }
                    return item;
                })
            };
        });
    };

    const handleAuditeeChange = (field: 'auditeeName' | 'auditeePosition', value: string) => {
        setChecklist(prev => prev ? { ...prev, [field]: value } : null);
    };
    
    const handleSubmitAudit = async () => {
        if (!checklist || !company || !user) return;
        
        const findings: NonConformanceIssue[] = checklist.items
            .filter(item => item.finding && item.finding !== 'Compliant' && item.finding !== 'Not Applicable')
            .map(item => ({
                id: item.id,
                finding: item.finding,
                level: item.level,
                category: 'Procedural', // Default category for now
                description: item.observation || 'No details provided.',
                regulationReference: item.regulationReference || 'N/A',
                correctiveActionPlan: null,
            }));
            
        const totalItems = checklist.items.length;
        const compliantItems = checklist.items.filter(i => i.finding === 'Compliant').length;
        const complianceScore = totalItems > 0 ? Math.round((compliantItems / totalItems) * 100) : 100;

        let status: QualityAudit['status'] = 'Compliant';
        if (findings.some(f => f.finding === 'Non-compliant' && f.level?.includes('Level'))) {
            status = 'Non-Compliant';
        } else if (findings.length > 0) {
            status = 'With Findings';
        }

        const newAuditData: Omit<QualityAudit, 'id'> = {
            companyId: company.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'Internal',
            auditor: user.name,
            area: checklist.area,
            status,
            complianceScore,
            checklistItems: checklist.items,
            nonConformanceIssues: findings,
            summary: `Audit of ${checklist.area} conducted by ${user.name}.`,
            auditeeName: checklist.auditeeName || null,
            auditeePosition: checklist.auditeePosition || null,
        };

        try {
            const docRef = await addDoc(collection(db, `companies/${company.id}/quality-audits`), newAuditData);
            toast({ title: 'Audit Submitted', description: 'The audit findings have been recorded.' });
            router.push(`/quality/${docRef.id}`);
        } catch (error) {
            console.error("Error submitting audit:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the audit findings.' });
        }
    };
    
    const handleSeedData = () => {
        if (!checklist) return;
        const sampleObservations = [
            "Procedure followed, but documentation could be clearer.",
            "Equipment shows minor wear and tear, but is functional.",
            "Staff knowledgeable, but refresher training is recommended.",
            "Logbook entry slightly ambiguous.",
            "Minor deviation from standard procedure noted, but did not affect safety."
        ];

        const sampleNonCompliances = [
            { text: "Required signature missing from maintenance release form.", level: 'Level 2 Finding', reg: "SACATS 43.02.4" },
            { text: "Fire extinguisher in hangar has an expired inspection tag.", level: 'Level 1 Finding', reg: "OHS Act 85 of 1993" },
            { text: "Pilot flight and duty records for the previous month were not available for review.", level: 'Level 3 Finding', reg: "SACATS 121.08.1" },
            { text: "Incorrect part number used for a minor repair, although the part was functionally equivalent.", level: 'Level 2 Finding', reg: "Internal Procedure MAN-005 Sec 2.1" },
        ];
        
        let observationIndex = 0;
        let nonComplianceIndex = 0;

        setChecklist(prev => {
            if (!prev) return null;
            return {
                ...prev,
                auditeeName: 'John Smith (Sample)',
                auditeePosition: 'Maintenance Manager (Sample)',
                items: prev.items.map((item, index) => {
                    const random = Math.random();
                    if (random < 0.3 && nonComplianceIndex < sampleNonCompliances.length) { 
                        const finding = sampleNonCompliances[nonComplianceIndex++];
                        return {
                            ...item,
                            finding: 'Non-compliant',
                            level: finding.level as FindingLevel,
                            observation: finding.text,
                            evidence: `Reviewed document #${100 + index} and interviewed staff.`,
                            regulationReference: finding.reg
                        };
                    } else if (random < 0.6 && observationIndex < sampleObservations.length) {
                        const obs = sampleObservations[observationIndex++];
                        return {
                            ...item,
                            finding: 'Observation',
                            level: null,
                            observation: obs,
                            evidence: 'Direct observation during facility walk-through.',
                            regulationReference: 'General Best Practice'
                        }
                    } else {
                        return { 
                            ...item,
                            finding: 'Compliant',
                            level: null,
                            observation: 'Procedure followed as required.',
                            evidence: 'No deviation noted.',
                            regulationReference: item.regulationReference
                        };
                    }
                })
            };
        });
        toast({
            title: 'Sample Data Loaded',
            description: 'The audit form has been populated with sample findings. You can now review and submit.'
        });
    };

    if (loading || userLoading) {
        return <div className="flex items-center justify-center h-screen"><p>Loading audit...</p></div>;
    }

    if (!checklist) {
        return <div className="flex items-center justify-center h-screen"><p>Audit checklist not found.</p></div>;
    }

    return (
        <>
            <main className="flex-1 p-4 md:p-8">
                <div className="flex items-center justify-between mb-4">
                     <h2 className="text-2xl font-bold">Performing Audit: {checklist.title}</h2>
                     <div className="flex gap-2">
                        <Button onClick={handleSeedData} variant="secondary">
                            <Bot className="mr-2 h-4 w-4" />
                            Seed Sample Data
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/quality?tab=checklists">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Checklists
                            </Link>
                        </Button>
                    </div>
                </div>
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
                                            onValueChange={(value: FindingStatus) => handleItemChange(item.id, 'finding', value)}
                                            className="flex flex-wrap gap-x-4 gap-y-2"
                                        >
                                            {FINDING_OPTIONS.map(opt => (
                                                <div key={opt.value} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={opt.value} id={`${item.id}-${opt.value}`} />
                                                    <Label htmlFor={`${item.id}-${opt.value}`} className="flex items-center gap-2 cursor-pointer">{opt.icon} {opt.label}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                    
                                    {(item.finding === 'Non-compliant' || item.finding === 'Partial' || item.finding === 'Observation') && (
                                        <div className="space-y-2 pt-2 border-t mt-4">
                                            <Label>Level</Label>
                                            <RadioGroup 
                                                value={item.level || (item.finding === 'Observation' ? 'Observation' : '')}
                                                onValueChange={(value: FindingLevel | 'Observation') => handleItemChange(item.id, 'level', value)}
                                                className="flex flex-wrap gap-x-4 gap-y-2"
                                            >
                                                {LEVEL_OPTIONS.map(opt => (
                                                    <div key={opt.value} className="flex items-center space-x-2">
                                                        <RadioGroupItem value={opt.value} id={`${item.id}-${opt.value}`} />
                                                        <Label htmlFor={`${item.id}-${opt.value}`} className="flex items-center gap-2 cursor-pointer">{opt.icon} {opt.label}</Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>
                                    )}
                                    
                                     <div className="space-y-2">
                                        <Label htmlFor={`regulation-${item.id}`}>Regulation Reference</Label>
                                        <Input id={`regulation-${item.id}`} placeholder="e.g., CAR 121.01.2" value={item.regulationReference || ''} onChange={(e) => handleItemChange(item.id, 'regulationReference', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`observation-${item.id}`}>Observation / Finding Details</Label>
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
        </>
    );
}
