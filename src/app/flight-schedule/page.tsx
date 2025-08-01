
import { getFlightSchedulePageData } from './data';
import { FlightSchedulePageContent } from './flight-schedule-page-content';
import type { Aircraft, Booking } from '@/lib/types';
import { cookies } from 'next/headers';

async function getInitialData() {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value;

    if (!companyId) {
        return { aircraft: [], bookings: [] };
    }

    try {
        return await getFlightSchedulePageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for flight schedule:", error);
        return { aircraft: [], bookings: [] };
    }
}

export default async function FlightSchedulePage() {
    const { aircraft, bookings } = await getInitialData();
    
    return (
        <FlightSchedulePageContent 
            initialAircraft={aircraft}
            initialBookings={bookings}
        />
    );
}

FlightSchedulePage.title = 'Flight Schedule';
