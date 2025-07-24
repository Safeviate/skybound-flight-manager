
'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/header';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { NewSafetyReportForm } from '../new-safety-report-form';
import type { SafetyReport } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { REPORT_TYPE_DEPARTMENT_MAPPING } from '@/lib/types';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';

function NewSafetyReportPage() {
    const { user, company, loading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (company) {
            const fetchReports = async () => {
                const reportsQuery = query(collection(db, `companies/${company.id}/safety-reports`));
                const reportsSnapshot = await getDocs(reportsQuery);
                setSafetyReports(reportsSnapshot.docs.map(doc => doc.data() as SafetyReport));
            };
            fetchReports();
        }
    }, [user, company, loading, router]);

    const handleNewReportSubmit = async (newReportData: Omit<SafetyReport, 'id' | 'submittedBy' | 'status' | 'filedDate' | 'department'> & { isAnonymous?: boolean }) => {
        if (!company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot file report without company context.' });
            return;
        }
        const { isAnonymous, ...reportData } = newReportData;
        const department = REPORT_TYPE_DEPARTMENT_MAPPING[reportData.type] || 'Management';
        
        let finalReportData: any = {
            companyId: company.id,
            submittedBy: isAnonymous ? 'Anonymous' : (user?.name || 'System'),
            status: 'Open' as SafetyReport['status'],
            filedDate: format(new Date(), 'yyyy-MM-dd'),
            department,
            ...reportData,
        };

        // Remove undefined properties before sending to Firestore
        Object.keys(finalReportData).forEach(key => {
            if (finalReportData[key] === undefined) {
                delete finalReportData[key];
            }
        });

        try {
            const docRef = await addDoc(collection(db, `companies/${company.id}/safety-reports`), finalReportData);
            router.push(`/safety/${docRef.id}`);
            toast({
                title: 'Report Filed Successfully',
                description: `Report ${finalReportData.reportNumber} has been submitted. You are now on the investigation page.`,
            });
        } catch(error) {
            console.error("Error saving new safety report:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save report to database.' });
        }
    };

    if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }
    
    return (
        <>
            <main className="flex-1 p-4 md:p-8">
               <div className="max-w-4xl mx-auto">
                 <NewSafetyReportForm safetyReports={safetyReports} onSubmit={handleNewReportSubmit} />
               </div>
            </main>
        </>
    )
}

NewSafetyReportPage.title = "File New Safety Report";
export default NewSafetyReportPage;
