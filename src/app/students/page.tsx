
import { getStudentsPageData } from './data';
import { StudentsPageContent } from './students-page-content';
import type { User } from '@/lib/types';

async function getInitialData(companyId: string): Promise<User[]> {
    try {
        return await getStudentsPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for students page:", error);
        return [];
    }
}

export default async function StudentsPageContainer() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const initialStudents = await getInitialData(companyId);
    
    return <StudentsPageContent initialStudents={initialStudents} />;
}

StudentsPageContainer.title = "Student Management";
