
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-provider';
import Header from '@/components/layout/header';
import { db } from '@/lib/firebase';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import type { AuditChecklist, QualityAudit, NonConformanceIssue, AuditArea } from '@/lib/types';
import { ChecklistCard } from '../checklist-card';
import { format } from 'date-fns';

export default function CompleteAuditChecklistPage() {
    const params = useParams();
    const router = useRouter();
    const { user, company, loading: userLoading } = useUser();
    const checklistId = params.checklistId as string;
    const { toast } = useToast();

    const [checklist, setChecklist] = useState<AuditChecklist | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }
        if (!company) {
            setLoading(false);
            return;
        }

        const fetchChecklist = async () => {
            setLoading(true);
            try {
                const checklistRef = doc(db, `companies/${company.id}/audit-checklists`, checklistId);
                const snapshot = await getDoc(checklistRef);

                if (snapshot.exists()) {
                    setChecklist({ id: snapshot.id, ...snapshot.data() } as AuditChecklist);
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Checklist not found.' });
                }
            } catch (error) {
                console.error("Error fetching checklist:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load checklist.' });
            } finally {
                setLoading(false);
            }
        };

        fetchChecklist();
    }, [checklistId, user, company, userLoading, router, toast]);

    const handleUpdate = (updatedChecklist: AuditChecklist) => {
        setChecklist(updatedChecklist);
    };

    const handleReset = (id: string) => {
        setChecklist(prev => 
            prev 
            ? { 
                ...prev, 
                items: prev.items.map(item => ({...item, finding: null, notes: ''})),
                department: '',
                auditeeName: '',
                auditeePosition: '',
                auditor: '',
            } 
            : null
        );
    };

    const handleChecklistEdit = (editedChecklist: AuditChecklist) => {
        // In a real app, this would save to the DB as a template edit
        setChecklist(editedChecklist);
    };

    const handleSubmit = async (completedChecklist: AuditChecklist) => {
        if (!company || !user) return;

        const applicableItems = completedChecklist.items.filter(item => item.finding !== 'Not Applicable');
        const compliantItems = applicableItems.filter(item => item.finding === 'Compliant').length;
        const totalApplicableItems = applicableItems.length;
        const complianceScore = totalApplicableItems > 0 ? Math.round((compliantItems / totalApplicableItems) * 100) : 100;

        const nonConformanceIssues: NonConformanceIssue[] = completedChecklist.items
            .filter(item => item.finding === 'Non-compliant' || item.finding === 'Partial')
            .map(item => ({
                id: `nci-${item.id}`,
                level: item.finding as NonConformanceIssue['level'],
                category: 'Procedural', // This could be made more dynamic in the future
                description: `${item.text} - Auditor Notes: ${item.notes || 'N/A'}`,
            }));

        let status: QualityAudit['status'] = 'Compliant';
        if (nonConformanceIssues.length > 0) {
            status = complianceScore < 80 ? 'Non-Compliant' : 'With Findings';
        }

        const newAudit: Omit<QualityAudit, 'id'> = {
            companyId: company.id,
            date: format(new Date(), 'yyyy-MM-dd'),
            type: 'Internal',
            auditor: completedChecklist.auditor || user.name,
            area: completedChecklist.area as AuditArea,
            status,
            complianceScore,
            nonConformanceIssues,
            summary: `Audit based on template "${completedChecklist.title}". Conducted by ${completedChecklist.auditor || user.name} on auditee ${completedChecklist.auditeeName} (${completedChecklist.auditeePosition}).`,
        };

        try {
            await addDoc(collection(db, `companies/${company.id}/quality-audits`), newAudit);
            toast({
                title: 'Audit Submitted',
                description: `A new quality audit record has been created with a score of ${complianceScore}%.`,
            });
            router.push('/quality?tab=audits');
        } catch (error) {
            console.error("Error submitting audit:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit audit.' });
        }
    };

    if (loading || userLoading) {
        return <div className="flex-1 flex items-center justify-center"><p>Loading...</p></div>;
    }

    if (!checklist) {
        return (
            <main className="flex-1 p-4 md:p-8">
                <p>Checklist not found.</p>
            </main>
        );
    }
    
    const pageTitle = `Audit: ${checklist.title}`;

    return (
        <div className="flex flex-col min-h-screen">
            <Header title={pageTitle} />
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center bg-muted/40">
                <div className="w-full max-w-4xl">
                    <ChecklistCard
                        checklist={checklist}
                        onUpdate={handleUpdate}
                        onReset={handleReset}
                        onEdit={handleChecklistEdit}
                        onSubmit={handleSubmit}
                    />
                </div>
            </main>
        </div>
    );
}

CompleteAuditChecklistPage.title = 'Complete Audit Checklist';

