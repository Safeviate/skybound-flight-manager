
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { AuditChecklist } from '@/lib/types';
import Header from '@/components/layout/header';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
                <p>Perform audit page for "{checklist.title}"</p>
                {/* Audit form and logic will be built here */}
            </main>
        </div>
    );
}
