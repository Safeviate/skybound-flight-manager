import { getDashboardData } from './data';
import { MyDashboardPageContent } from './my-dashboard-page-content';
import type { Booking } from '@/lib/types';
import { getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This function is a placeholder for server-side auth.
// In a real app, you would use a more robust method like NextAuth.js or server-side cookies.
async function getUserId(): Promise<string | null> {
    const user = auth.currentUser;
    return user ? user.uid : null;
}

async function getInitialData(companyId: string, userId: string): Promise<{ bookingsList: Booking[] }> {
    if (!userId) {
        return { bookingsList: [] };
    }
    try {
        return await getDashboardData(companyId, userId);
    } catch (error) {
        console.error("Failed to fetch initial data for dashboard:", error);
        return { bookingsList: [] };
    }
}

export default async function MyDashboardPage() {
    // This is a simplified way to get user/company for server components.
    // In a real app, this would come from a secure session.
    const companyId = 'skybound-aero';
    // This is not a reliable way to get the user on the server.
    // We will assume a placeholder or handle it client-side for now.
    // A more robust solution is needed for production.
    return <MyDashboardPageContent />;
}

MyDashboardPage.title = "My Dashboard";
