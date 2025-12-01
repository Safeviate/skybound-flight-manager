
'use client';

import { getQualityPageData } from '../quality/data';
import { TaskTrackerPageContent } from './task-tracker-page-content';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User, CompanyDepartment, Aircraft, UnifiedTask } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';

export default function TaskTrackerPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        tasks: UnifiedTask[],
        personnel: User[],
    }>({ tasks: [], personnel: [] });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getQualityPageData(company.id);
                setInitialData({
                    tasks: data.unifiedTasks,
                    personnel: data.personnelList,
                });
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);
    
    return <TaskTrackerPageContent 
                initialTasks={initialData.tasks}
                personnel={initialData.personnel}
            />;
}

TaskTrackerPageContainer.title = 'Task Tracker';
