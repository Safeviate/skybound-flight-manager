

import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import type { Booking } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { cookies } from 'next/headers';

async function getInitialData() {
    const cookieStore = cookies();
    const companyIdCookie = cookieStore.get('skybound_last_company_id');
    const userIdCookie = cookieStore.get('skybound_last_user_id');
    const companyId = companyIdCookie?.value;
    const userId = userIdCookie?.value;

    if (!companyId || !userId) {
        return { upcomingBookings: [] };
    }

    try {
        const { bookingsList } = await getDashboardData(companyId, userId);
        return { upcomingBookings: bookingsList };
    } catch (error) {
        console.error("Failed to fetch initial data for dashboard:", error);
        return { upcomingBookings: [] };
    }
}


export default async function MyDashboardPage() {
    const { upcomingBookings } = await getInitialData();
    
    return (
        <MyDashboardPageContent initialBookings={upcomingBookings} />
    );
}

MyDashboardPage.title = 'My Dashboard';

