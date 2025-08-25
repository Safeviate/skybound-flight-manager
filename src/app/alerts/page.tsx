
'use client';

import { getAlertsPageData } from './data';
import { AlertsPageContent } from './alerts-page-content';
import type { Alert } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';


export default function AlertsPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ alertsList: Alert[] }>({ alertsList: [] });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getAlertsPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);


    return <AlertsPageContent initialAlerts={initialData.alertsList} />;
}

AlertsPageContainer.title = 'Alerts & Notifications';
