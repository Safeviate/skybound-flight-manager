
'use client';

import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import type { Booking, SafetyReport, QualityAudit, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useEffect, useState } from 'react';


export default function MyDashboardPage() {
    const { user, company } = useUser();
    const [initialData, setInitialData] = useState({
        upcomingBookings: [],
        allUserBookings: [],
        openSafetyReports: [],
        openQualityAudits: [],
        assignedStudents: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (user && company) {
                try {
                    const data = await getDashboardData(company.id, user.id);
                    setInitialData(data);
                } catch (error) {
                    console.error("Failed to fetch initial dashboard data on client:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                 setLoading(false);
            }
        }
        loadData();
    }, [user, company]);
    
    // While loading, we can show a skeleton or loading state via the content component
    return <MyDashboardPageContent initialData={initialData} />;
}

MyDashboardPage.title = "My Dashboard";
