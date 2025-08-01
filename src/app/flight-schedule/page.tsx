
import { getFlightSchedulePageData } from './data';
import { FlightSchedulePageContent } from './flight-schedule-page-content';
import type { Aircraft, Booking, User } from '@/lib/types';
import { cookies } from 'next/headers';

async function getInitialData() {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value;

    if (!companyId) {
        return { aircraft: [], bookings: [], personnel: [] };
    }

    try {
        return await getFlightSchedulePageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for flight schedule:", error);
        return { aircraft: [], bookings: [], personnel: [] };
    }
}

export default async function FlightSchedulePage() {
    const { aircraft, bookings, personnel } = await getInitialData();
    
    return (
        <FlightSchedulePageContent 
            initialAircraft={aircraft}
            initialBookings={bookings}
            initialPersonnel={personnel}
        />
    );
}

FlightSchedulePage.title = 'Flight Schedule';
