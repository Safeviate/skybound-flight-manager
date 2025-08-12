
import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import type { Booking } from '@/lib/types';


// This is a simplified way to get the current user on the server.
// In a real app, you might use a more robust session management system.
async function getCurrentUserId(): Promise<string | null> {
    const authHeader = headers().get('Authorization');
    if (authHeader) {
        const token = authHeader.split('Bearer ')[1];
        // In this app, the token is just 'companyId:userId'. We only need the userId.
        const [_, userId] = token.split(':');
        return userId || null;
    }

    // Fallback for client-side rendering where auth state might be available differently
    // This part is complex and depends on session management. For this app's structure,
    // the dashboard data fetching will primarily rely on the client-side user context.
    return null; 
}


export default async function MyDashboardPage() {
    const companyId = 'skybound-aero'; // Hardcoded for this app
    const userId = await getCurrentUserId();
    
    // Fetch initial bookings, but handle the case where userId is null on server render
    let initialBookings: Booking[] = [];
    if (userId) {
        try {
            const data = await getDashboardData(companyId, userId);
            initialBookings = data.bookingsList;
        } catch (error) {
            console.error("Failed to fetch initial dashboard data on server:", error);
            // Gracefully handle error, page can still load and fetch on client
        }
    }
    
    return <MyDashboardPageContent initialBookings={initialBookings} />;
}

MyDashboardPage.title = "My Dashboard";
