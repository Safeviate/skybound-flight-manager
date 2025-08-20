

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SafetyReport, SafetyReportType, Department } from '@/lib/types';
import { NewSafetyReportForm } from './new-safety-report-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { REPORT_TYPE_DEPARTMENT_MAPPING } from '@/lib/types';


export default function NewSafetyReportPage() {
    const { user, company } = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const handleNewReport = async (data: Omit<SafetyReport, 'id' | 'status' | 'filedDate' | 'reportNumber' | 'companyId'>) => {
        if (!user || !company) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to file a report.' });
            return;
        }
        
        // Fix for sequential numbering: Query Firestore for the current count of reports of the same type.
        const reportsCollection = collection(db, `companies/${company.id}/safety-reports`);
        const q = query(reportsCollection, where('reportType', '==', data.reportType));
        const snapshot = await getCountFromServer(q);
        const nextId = snapshot.data().count + 1;

        const reportTypeAbbr = (data.reportType as string).split(' ').map(w => w[0]).join('');
        const reportNumber = `${reportTypeAbbr}-${String(nextId).padStart(3, '0')}`;
        
        const newReport: Omit<SafetyReport, 'id'> = {
            ...data,
            companyId: company.id,
            reportNumber,
            status: 'Open',
            filedDate: format(new Date(), 'yyyy-MM-dd'),
            department: REPORT_TYPE_DEPARTMENT_MAPPING[data.reportType as SafetyReportType] || 'Management',
            occurrenceDate: format(data.occurrenceDate, 'yyyy-MM-dd'),
            pilotInCommand: data.pilotInCommand || null,
            raFollowed: data.raFollowed || null,
            pilotFlying: data.pilotFlying || null,
        };

        try {
            const docRef = await addDoc(collection(db, `companies/${company.id}/safety-reports`), newReport);
            toast({
                title: 'Report Filed Successfully',
                description: `Your report (${reportNumber}) has been submitted.`,
            });
            router.push(`/safety/${docRef.id}`);
        } catch (error) {
            console.error("Error submitting report:", error);
            toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not submit your report. Please try again.',
            });
        }
    };
    
    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>File New Safety Report</CardTitle>
                        <CardDescription>
                            Your report will be submitted to the Safety Department for review. Please provide as much detail as possible.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <NewSafetyReportForm onSubmit={handleNewReport} />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

NewSafetyReportPage.title = "File New Safety Report";




