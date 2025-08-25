
'use client';

import { useEffect, useState } from 'react';
import { getPersonnelPageData } from './data';
import { PersonnelPageContent } from './personnel-page-content';
import type { User } from '@/lib/types';
import { useUser } from '@/context/user-provider';

function PersonnelPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialPersonnel, setInitialPersonnel] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (company) {
                setLoading(true);
                const personnel = await getPersonnelPageData(company.id);
                setInitialPersonnel(personnel);
                setLoading(false);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

    if (loading || userLoading) {
        return <div className="flex-1 flex items-center justify-center"><p>Loading personnel...</p></div>;
    }
    
    return <PersonnelPageContent initialPersonnel={initialPersonnel} />;
}

PersonnelPageContainer.title = "Personnel Management";

export default PersonnelPageContainer;
