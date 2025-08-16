
import { DashboardPageContent } from './dashboard-page-content';
import { getDashboardData } from './data';
import type { Aircraft, Booking, User } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const data = await getDashboardData(companyId);
        return data || { aircraft: [], bookings: [], users: [], students: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for dashboard page:", error);
        return { aircraft: [], bookings: [], users: [], students: [] };
    }
}


export default async function DashboardPage() {
  const companyId = 'skybound-aero';
  const { aircraft, bookings, users, students } = await getInitialData(companyId);

  return <DashboardPageContent 
            initialAircraft={aircraft}
            initialBookings={bookings}
            initialUsers={users}
            initialStudents={students}
         />;
}

DashboardPage.title = "Company Dashboard";
