
import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import { getAuth } from 'firebase/auth';
import type { Booking, SafetyReport, QualityAudit, User } from '@/lib/types';


// This is a simplified way to get the current user on the server.
// In a real app, you might use a more robust session management system.
async function getCurrentUserId(): Promise<string | null> {
    const auth = getAuth();
    // This is problematic on the server. A proper session management is needed.
    // For now, we'll assume the client-side fetch will handle it if this fails.
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user ? user.uid : null);
        });
    });
}


export default async function MyDashboardPage() {
    const companyId = 'skybound-aero';
    const userId = await getCurrentUserId();
    
    let initialData = {
        upcomingBookings: [],
        allUserBookings: [],
        openSafetyReports: [],
        openQualityAudits: [],
        assignedStudents: [],
    };

    if (userId) {
        try {
            initialData = await getDashboardData(companyId, userId);
        } catch (error) {
            console.error("Failed to fetch initial dashboard data on server:", error);
            // Gracefully handle error, page can still load and fetch on client
        }
    }
    
    return <MyDashboardPageContent initialData={initialData} />;
}

MyDashboardPage.title = "My Dashboard";
