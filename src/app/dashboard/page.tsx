
import { DashboardPageContent } from './dashboard-page-content';
import { getDashboardData } from './data';
import type { Aircraft, Booking, User } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const data = await getDashboardData(companyId);
        return data || { aircraft: [], bookings: [], users: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for dashboard page:", error);
        return { aircraft: [], bookings: [], users: [] };
    }
}


export default async function DashboardPage() {
  const companyId = 'skybound-aero';
  const { aircraft, bookings, users } = await getInitialData(companyId);

  return <DashboardPageContent 
            initialAircraft={aircraft}
            initialBookings={bookings}
            initialUsers={users}
         />;
}

DashboardPage.title = "Company Dashboard";
