

import { MyDashboardPageContent } from './my-dashboard-page-content';
// No longer need to fetch initial data on the server, the UserProvider handles it client-side.
import type { Booking } from '@/lib/types';

export default async function MyDashboardPage() {
    // The initial data is now loaded by the client-side UserProvider
    const upcomingBookings: Booking[] = [];
    
    return (
        <MyDashboardPageContent initialBookings={upcomingBookings} />
    );
}

MyDashboardPage.title = 'My Dashboard';
