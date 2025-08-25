
'use client';

import { getSafetyPageData } from './data';
import { SafetyPageContent } from './safety-page-content';
import type { SafetyReport, Risk, Booking, ManagementOfChange } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';


export default function SafetyPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        reportsList: SafetyReport[],
        risksList: Risk[],
        bookingsList: Booking[],
        mocList: ManagementOfChange[],
    }>({ reportsList: [], risksList: [], bookingsList: [], mocList: [] });


    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getSafetyPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);


    return (
        <SafetyPageContent 
            initialReports={initialData.reportsList} 
            initialRisks={initialData.risksList}
            initialBookings={initialData.bookingsList}
            initialMoc={initialData.mocList}
        />
    )
}

SafetyPageContainer.title = 'Safety Management System';
