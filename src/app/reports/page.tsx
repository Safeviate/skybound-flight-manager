
import { getReportsPageData } from './data';
import { ReportsPageContent } from './reports-page-content';

async function getInitialData(companyId: string) {
    try {
        const data = await getReportsPageData(companyId);
        return data || { bookings: [], aircraft: [], users: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for reports page:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}

export default async function ReportsPage() {
    const companyId = 'skybound-aero';
    const { bookings, aircraft, users } = await getInitialData(companyId);

    return <ReportsPageContent 
        initialBookings={bookings}
        initialAircraft={aircraft}
        initialUsers={users}
    />;
}

ReportsPage.title = 'Advanced Analytics';
