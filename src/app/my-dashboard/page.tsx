
import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Booking, SafetyReport, QualityAudit, User } from '@/lib/types';


// This is a simplified way to get the current user on the server.
// In a real app, you might use a more robust session management system.
async function getCurrentUserOnServer(): Promise<{ userId: string | null; companyId: string | null }> {
    // In a real app, this would be more robust. For this app, we rely on a pattern
    // where the client UserProvider will have the final say.
    // However, for initial server render, we can try to get it.
    const authHeader = headers().get('Authorization');
    if (authHeader) {
        const token = authHeader.split('Bearer ')[1];
        const [companyId, userId] = token.split(':');
        return { userId: userId || null, companyId: companyId || null };
    }
    
    // This is a fallback for initial load where headers might not be set.
    // The client will take over and fetch data if needed.
    return { userId: null, companyId: null };
}


export default async function MyDashboardPage() {
    const { userId, companyId } = await getCurrentUserOnServer();

    // Set a default companyId if not found, to avoid crashes.
    const finalCompanyId = companyId || 'skybound-aero';
    
    // Fetch initial data, but handle the case where userId is null on server render
    let initialData = {
        upcomingBookings: [],
        allUserBookings: [],
        openSafetyReports: [],
        openQualityAudits: [],
        assignedStudents: [],
    };

    if (userId) {
        try {
            initialData = await getDashboardData(finalCompanyId, userId);
        } catch (error) {
            console.error("Failed to fetch initial dashboard data on server:", error);
            // Gracefully handle error, page can still load and fetch on client
        }
    }
    
    return <MyDashboardPageContent initialData={initialData} />;
}

MyDashboardPage.title = "My Dashboard";
