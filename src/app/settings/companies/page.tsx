
import { getCompaniesPageData } from './data';
import { CompaniesPageContent } from './companies-page-content';
import type { Company } from '@/lib/types';

async function getInitialData(): Promise<Company[]> {
    try {
        return await getCompaniesPageData();
    } catch (error) {
        console.error("Failed to fetch initial data for companies page:", error);
        return [];
    }
}

export default async function CompaniesPageContainer() {
    const initialCompanies = await getInitialData();
    
    return <CompaniesPageContent initialCompanies={initialCompanies} />;
}

CompaniesPageContainer.title = "Manage Companies";
