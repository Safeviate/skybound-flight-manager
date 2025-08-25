
'use client';

import { getStudentsPageData } from './data';
import { StudentsPageContent } from './students-page-content';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';


export default function StudentsPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialStudents, setInitialStudents] = useState<User[]>([]);

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getStudentsPageData(company.id);
                setInitialStudents(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);
    
    return <StudentsPageContent initialStudents={initialStudents} />;
}

StudentsPageContainer.title = "Student Management";
