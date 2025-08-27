

'use client';

import { getStudentsPageData } from './data';
import { StudentsPageContent } from './students-page-content';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';


export default function StudentsPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialStudents, setInitialStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (company) {
                setLoading(true);
                const data = await getStudentsPageData(company.id);
                setInitialStudents(data);
                setLoading(false);
            } else if (!userLoading) {
                setLoading(false);
            }
        }
        loadData();
    }, [company, userLoading]);
    
    if (loading) {
        return <div className="flex-1 flex items-center justify-center"><p>Loading students...</p></div>
    }

    return <StudentsPageContent initialStudents={initialStudents} />;
}

StudentsPageContainer.title = "Student Management";
