
import { getBookingsPageData } from './data';
import { BookingsPageContent } from './bookings-page-content';
import type { Booking } from '@/lib/types';
import { cookies } from 'next/headers';

async function getInitialData(): Promise<Booking[]> {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value || 'skybound-aero';
    if (!companyId) return [];

    try {
        return await getBookingsPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for bookings page:", error);
        return [];
    }
}

export default async function BookingsPage() {
    const initialBookings = await getInitialData();
    
    return <BookingsPageContent initialBookings={initialBookings} />;
}

BookingsPage.title = "Bookings Log";
