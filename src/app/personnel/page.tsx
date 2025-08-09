
import { getPersonnelPageData } from './data';
import { PersonnelPageContent } from './personnel-page-content';
import type { User } from '@/lib/types';

async function getInitialData(companyId: string): Promise<User[]> {
    try {
        return await getPersonnelPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for personnel page:", error);
        return [];
    }
}

export default async function PersonnelPageContainer() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const initialPersonnel = await getInitialData(companyId);
    
    return <PersonnelPageContent initialPersonnel={initialPersonnel} />;
}

PersonnelPageContainer.title = "Personnel Management";
